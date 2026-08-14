/*
 * Project: De-Insure (Autonomous Cold Chain Parametric Insurance Framework)
 * Component: Device Firmware (ESP32 Hardware Sensor Engine)
 * Description: Fail-closed physical sensor engine reading DHT22, UART2 GPS, ADC Battery.
 * Hardware Security: SHA-256 telemetry hashing, ECDSA secp256k1 signature, Watchdog Timer.
 * Strict Fail-Closed Policy: Explicit SENSOR_ERROR / GPS_UNAVAILABLE states. Zero fake fallbacks.
 */

#include <Arduino.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <TinyGPS++.h>
#include <esp_task_wdt.h>

#include "mbedtls/md.h"
#include "mbedtls/ecdsa.h"
#include "mbedtls/entropy.h"
#include "mbedtls/ctr_drbg.h"
#include "mbedtls/pk.h"

// --- Hardware Pin Definitions ---
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// Physical Hardware GPS Module on UART2 (RX2 = GPIO 16, TX2 = GPIO 17)
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

// Battery ADC Pin (GPIO 34)
#define BATTERY_ADC_PIN 34

// --- WDT Configuration (10 Second Timeout) ---
#define WDT_TIMEOUT_SECONDS 10

// --- Configuration (Environment / Config Injection) ---
#ifndef WIFI_SSID
#define WIFI_SSID "Admin"
#endif

#ifndef WIFI_PASS
#define WIFI_PASS "admin@123"
#endif

#ifndef AWS_IOT_ENDPOINT
#define AWS_IOT_ENDPOINT "avlxhxuyvpb4m-ats.iot.eu-north-1.amazonaws.com"
#endif

const int aws_port = 8883;
const char* mqtt_topic = "deinsure/telemetry";
const char* mqtt_client_id = "ESP32_DeInsure_Node1";

// AWS Root CA Certificate
const char* aws_root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF\n" \
"ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6\n" \
"b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL\n" \
"MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv\n" \
"b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj\n" \
"ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM\n" \
"9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw\n" \
"IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6\n" \
"VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L\n" \
"93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm\n" \
"jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC\n" \
"AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA\n" \
"A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI\n" \
"U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs\n" \
"N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv\n" \
"o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU\n" \
"5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy\n" \
"rqXRfboQnoZsG4q5WTP468SQvvG5\n" \
"-----END CERTIFICATE-----\n";

// AWS Client Certificate
const char* aws_client_cert = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIDWTCCAkGgAwIBAgIUf54t6VovfIFarSdcfXenHzBvaWYwDQYJKoZIhvcNAQEL\n" \
"BQAwTTFLMEkGA1UECwxCQW1hem9uIFdlYiBTZXJ2aWNlcyBPPUFtYXpvbi5jb20g\n" \
"SW5jLiBMPVNlYXR0bGUgU1Q9V2FzaGluZ3RvbiBDPVVTMB4XDTI2MDgxMTEzMjEx\n" \
"OFoXDTQ5MTIzMTIzNTk1OVowHjEcMBoGA1UEAwwTQVdTIElvVCBDZXJ0aWZpY2F0\n" \
"ZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJdS9M6HP1Vf++EJTG/\n" \
"Sisyxa117xFPp24MTCpPuaEJaZyRarVKQiAVC+6Dzx9SC4oRN8IdKq3cZcydLmS7\n" \
"2Sw9m/1eGQaCyoXVMPWX9dsLMX2rA6stxgiapvY2x95JIxVrJBEMJF9zkdYEnBlc\n" \
"yC9CuEyCHd2Q5s6oylIZWOEh5VcwqT037QT7ZsDidfnBncW5HZTj7D2GpNLI2/T8\n" \
"ac8EJlaR/jVZGuUzA4hsp+H6zkEvZQ4jw5/VctCDAMbCn7f/gLxM+spWoEUAVpqu\n" \
"xpmzzu5TqDsKCOk+MFYSsiHPWDt0gptHfiEPwce8lkX6937vph2TyBtFCDTiS7/I\n" \
"IPsCAwEAAaNgMF4wHwYDVR0jBBgwFoAU25JUTM2lBg7KzKbjNARSc0yqhGowHQYD\n" \
"VR0OBBYEFKGsAtNwYn/jR/DSDhJd0hDc0djOMAwGA1UdEwEB/wQCMAAwDgYDVR0P\n" \
"AQH/BAQDAgeAMA0GCSqGSIb3DQEBCwUAA4IBAQBxY4vGsKX45pG4YtREZC/rkA6t\n" \
"AfSkBVHieJVwkXpKe56bLGfwRi+AH0jEVEkfz7JjL7WuLLmlXj1bVua+LCzAqnXI\n" \
"19mb0hE2Bnn36gvoWfAJuAZ25JO0JToqR7f9LoMAYLgK/c6rxHGaNv97QRnp1dLr\n" \
"5pGsGMYOhIpHew1f7laF2sQm2Vq6JzwpQ+22Ra7Epnywg/sAwWGYUigKhssB2dre\n" \
"NsYlcKaZnwybiEsVjDHRc0z2+JP/X9uS/sz2+VFP4KpVUDcGWUPDShPkXggts96h\n" \
"1BasRvNq+98KNbxG9X7mzpiVewCvlGDTkfD6L+nIuGYtGC6zMgK+fRBoUCFO\n" \
"-----END CERTIFICATE-----\n";

// AWS Client Key
const char* aws_client_key = \
"-----BEGIN RSA PRIVATE KEY-----\n" \
"MIIEowIBAAKCAQEAsl1L0zoc/VV/74QlMb9KKzLFrXXvEU+nbgxMKk+5oQlpnJFq\n" \
"tUpCIBUL7oPPH1ILihE3wh0qrdxlzJ0uZLvZLD2b/V4ZBoLKhdUw9Zf12wsxfasD\n" \
"qy3GCJqm9jbH3kkjFWskEQwkX3OR1gScGVzIL0K4TIId3ZDmzqjKUhlY4SHlVzCp\n" \
"PTftBPtmwOJ1+cGdxbkdlOPsPYak0sjb9PxpzwQmVpH+NVka5TMDiGyn4frOQS9l\n" \
"DiPDn9Vy0IMAxsKft/+AvEz6ylagRQBWmq7GmbPO7lOoOwoI6T4wVhKyIc9YO3SC\n" \
"m0d+IQ/Bx7yWRfr3fu+mHZPIG0UINOJLv8gg+wIDAQABAoIBAHiPi1MpMrMh+anh\n" \
"/moTzIRKe0d2MbPXzWobMdhfry9kd1h3ClOj7/JTh48e1P9sq5QVc0ToBhMiqESX\n" \
"8eXw+yhmNGwcEHpQKagwpDk9D9eRR1CUKZSpCfSC5FwERzC+6tHta6GCPYuvSGIL\n" \
"F6AlEMKxLHW6dYlwCjKh8K9xppv09gTVwq1bsWSQF5pEGe+NjoAD6z1WgktFyhA9\n" \
"Ki9M0F1JHzsNhJXsWoZv459KbgMasCOiHybmCoagHr49+vxX9SqPcd6D9Tw4Dyu8\n" \
"mm5KRDw+5SNQgvT+JJ6UK+Hrc7ey4TX3eDOUBHMsHDuVXO4G5VsMc4M0dKD94wIJ\n" \
"YRMLKlECgYEA4hFdtfcrlP5D9LMBrMSEbHg+RSTMQ5orHZpw+0hmaf0nHhGpfKEk\n" \
"govHc8qnsUf2+i9X0B0wsjKuPOZcpIzcA36+LSWDi96tAPKsYuLtTwVi9/dmae8+\n" \
"GmOWQKEKzxcY/dz+PWlgCeesJpFCxoV79M/txMp7jAWIu2iT6kDw0a0CgYEAyfsC\n" \
"g75C/2ivlcc2si+uujL2lDznMqSVC4lwcpqVj+EQtJxaNINKYSemDn3yAljqcI2A\n" \
"I+6SvBnK42Y+q979tMUgqTA7o+Dw1dGzByFVtUMLWyc09a3z+5QcT+GmG4rsNVro\n" \
"5A4D1yqCtmkmF+apdJDUjsRmFFEVVPhXGcxZIkcCgYBVDNOEsgjjdQV7+hyXMxfe\n" \
"9x32RXHTvRybdo8q+oINPgCJf3uUN8vUkWHoXkXYnIp+dXFECrdXU1nZ75DLF3Nu\n" \
"nTBPK93hsVTFFodkbJt7LzucrqcJE8j5hJ3ykqPOZZIxcAL2d755+374w42rwmxw\n" \
"HgoGD2eLtklKuH1tlCEFwQKBgBM2d0TE4madNKaQrplAg+ReWKo9KNjeYvcX+cRN\n" \
"BBENnaMwhDweiQK43MjgHhcvEg3mx9ujI/4UjgIXhbqfmY6KedLeLa4nBYGxUtBI\n" \
"0XhOilP/ZMBB7cVuj0rh8gUIr/NbVG/tDVx4RLrJQcBgRpo59J4n/HXOSLMudEqV\n" \
"75ydAoGBAK5dLs3g0neuoZbtVxGWbCqnpTmUonW6PQscvhWNMmCLLWwQAs9GOO+9\n" \
"CWAb/9QTCYSxbSQoMGT0O3CrtcmaDTpgAJWX35tN693M3A2WECpw4g/suEUjcuEM\n" \
"MrmF2eHxatKEZTFNIVKBNyv1mbx7gJi/sLjeUy7dq6Rg2HAexli3\n" \
"-----END RSA PRIVATE KEY-----\n";

// Hardware ECDSA secp256k1 Key (For Telemetry Signing)
const char* ecdsa_private_key = \
"-----BEGIN EC PRIVATE KEY-----\n" \
"MHQCAQEEICfheewXlIm5k7ETedNwAHQqZ2JVFGyCDtNOCgYCEmbuoAcGBSuBBAAK\n" \
"oUQDAgAE\n" \
"-----END EC PRIVATE KEY-----\n";

WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);

mbedtls_pk_context pk_ctx;
mbedtls_entropy_context entropy;
mbedtls_ctr_drbg_context ctr_drbg;

uint32_t telemetry_sequence = 0;

// Read Physical Battery Percentage with Error Handling
int getPhysicalBatteryPercent(bool &error) {
    int raw = analogRead(BATTERY_ADC_PIN);
    if (raw < 100 || raw > 4050) {
        error = true;
        return -1;
    }
    error = false;
    float pinVoltage = (raw / 4095.0f) * 3.3f * 2.0f;
    int pct = (int)(((pinVoltage - 3.2f) / (4.2f - 3.2f)) * 100.0f);
    return constrain(pct, 0, 100);
}

// Read Physical GPS Module with Strict Fix Check
bool getPhysicalGPSLocation(float &lat, float &lng) {
    while (gpsSerial.available() > 0) {
        gps.encode(gpsSerial.read());
    }
    if (gps.location.isValid() && gps.location.age() < 5000) {
        lat = (float)gps.location.lat();
        lng = (float)gps.location.lng();
        return true;
    }
    return false;
}

void setupCrypto() {
    mbedtls_pk_init(&pk_ctx);
    mbedtls_entropy_init(&entropy);
    mbedtls_ctr_drbg_init(&ctr_drbg);
    
    const char *pers = "deinsure_device_secp256k1";
    mbedtls_ctr_drbg_seed(&ctr_drbg, mbedtls_entropy_func, &entropy, (const unsigned char *)pers, strlen(pers));

    int ret = mbedtls_pk_parse_key(&pk_ctx, (const unsigned char*)ecdsa_private_key, strlen(ecdsa_private_key) + 1, NULL, 0);
    if (ret != 0) {
        Serial.printf("[ERROR] Failed to parse ECDSA Key! Code: -0x%04x\n", -ret);
    }
}

void connectAWS() {
    Serial.print("Connecting to WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi Connected!");
    } else {
        Serial.println("\nWiFi Connection Failed!");
        return;
    }

    secureClient.setCACert(aws_root_ca);
    secureClient.setCertificate(aws_client_cert);
    secureClient.setPrivateKey(aws_client_key);

    mqttClient.setServer(AWS_IOT_ENDPOINT, aws_port);
    mqttClient.setBufferSize(512);

    Serial.print("Connecting to AWS IoT");
    attempts = 0;
    while (!mqttClient.connected() && attempts < 10) {
        if (mqttClient.connect(mqtt_client_id)) {
            Serial.println("\nAWS IoT Connected!");
        } else {
            Serial.print(".");
            delay(1000);
            attempts++;
        }
    }
}

void setup() {
    Serial.begin(115200);

    // Initialize Task Watchdog Timer (TWDT)
    esp_task_wdt_init(WDT_TIMEOUT_SECONDS, true);
    esp_task_wdt_add(NULL);

    dht.begin();
    gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

    setupCrypto();
    connectAWS();
}

void loop() {
    esp_task_wdt_reset();

    if (!mqttClient.connected()) {
        connectAWS();
    }
    mqttClient.loop();

    telemetry_sequence++;
    uint32_t nonce = esp_random();
    uint32_t timestamp = (uint32_t)(millis() / 1000);

    // Read Sensors with Strict Fail-Closed Policies
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    bool dht_error = isnan(temp) || isnan(hum);

    float lat = 0.0f, lng = 0.0f;
    bool gps_valid = getPhysicalGPSLocation(lat, lng);

    bool bat_error = false;
    int battery = getPhysicalBatteryPercent(bat_error);

    // Build Payload JSON
    char payload_body[384];
    if (dht_error) {
        snprintf(payload_body, sizeof(payload_body),
                 "{\"device_id\":\"%s\",\"seq\":%u,\"ts\":%u,\"nonce\":%u,\"temp_status\":\"SENSOR_ERROR\",\"hum_status\":\"SENSOR_ERROR\"",
                 mqtt_client_id, telemetry_sequence, timestamp, nonce);
    } else {
        snprintf(payload_body, sizeof(payload_body),
                 "{\"device_id\":\"%s\",\"seq\":%u,\"ts\":%u,\"nonce\":%u,\"temp\":%.2f,\"hum\":%.2f",
                 mqtt_client_id, telemetry_sequence, timestamp, nonce, temp, hum);
    }

    char location_str[128];
    if (gps_valid) {
        snprintf(location_str, sizeof(location_str), ",\"lat\":%.4f,\"lng\":%.4f", lat, lng);
    } else {
        snprintf(location_str, sizeof(location_str), ",\"gps_status\":\"GPS_UNAVAILABLE\"");
    }

    char battery_str[64];
    if (bat_error) {
        snprintf(battery_str, sizeof(battery_str), ",\"battery_status\":\"BATTERY_ERROR\"}");
    } else {
        snprintf(battery_str, sizeof(battery_str), ",\"battery\":%d}", battery);
    }

    char raw_payload[512];
    snprintf(raw_payload, sizeof(raw_payload), "%s%s%s", payload_body, location_str, battery_str);

    // Compute SHA-256 Hash of Payload
    unsigned char hash[32];
    mbedtls_md_context_t ctx;
    mbedtls_md_init(&ctx);
    mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 0);
    mbedtls_md_starts(&ctx);
    mbedtls_md_update(&ctx, (const unsigned char *)raw_payload, strlen(raw_payload));
    mbedtls_md_finish(&ctx, hash);
    mbedtls_md_free(&ctx);

    // Hardware ECDSA secp256k1 Signing
    unsigned char sig[MBEDTLS_MPI_MAX_SIZE];
    size_t sig_len = 0;
    int ret = mbedtls_pk_sign(&pk_ctx, MBEDTLS_MD_SHA256, hash, sizeof(hash), sig, &sig_len, mbedtls_ctr_drbg_random, &ctr_drbg);

    if (ret != 0 || sig_len == 0) {
        Serial.println("[FAIL-CLOSED] ECDSA signing failed! Aborting transmission.");
        delay(5000);
        return;
    }

    char sig_hex[160] = {0};
    for (size_t i = 0; i < sig_len; i++) {
        sprintf(sig_hex + (i * 2), "%02x", sig[i]);
    }

    // Attach Final Signature to Payload
    char final_packet[700];
    snprintf(final_packet, sizeof(final_packet),
             "{\"data\":%s,\"sig\":\"%s\"}", raw_payload, sig_hex);

    Serial.println("[TELEMETRY STREAM] Publishing:");
    Serial.println(final_packet);

    if (mqttClient.publish(mqtt_topic, final_packet)) {
        Serial.println("--> [SUCCESS] Packet Transmitted.");
    } else {
        Serial.println("--> [FAIL] MQTT Publish Failed.");
    }

    delay(5000);
}
