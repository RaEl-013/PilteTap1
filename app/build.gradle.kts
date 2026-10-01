plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val versionCodeProp = (project.findProperty("versionCode") as String?)?.toInt() ?: 1
val versionNameProp = (project.findProperty("versionName") as String?) ?: "v1"

android {
    // namespace VE applicationId MainActivity-in package adı ilə EYNİ olmalıdır
    namespace = "az.plite.tap"
    compileSdk = 34

    defaultConfig {
        applicationId = "az.plite.tap"
        minSdk = 24
        targetSdk = 34
        versionCode = versionCodeProp
        versionName = versionNameProp
    }

    // İmza: CI-də app/keramo.keystore yaradılır (secrets-dən).
    // Lokal yığımda (Android Studio) eyni faylı app/ papkasına qoyun.
    signingConfigs {
        create("release") {
            val ksFile = rootProject.file("app/keramo.keystore")
            if (ksFile.exists()) {
                storeFile = ksFile
                storePassword = System.getenv("KERAMO_STORE_PASSWORD") ?: "keramo123"
                keyAlias = System.getenv("KERAMO_KEY_ALIAS") ?: "keramo"
                keyPassword = System.getenv("KERAMO_KEY_PASSWORD") ?: "keramo123"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}
