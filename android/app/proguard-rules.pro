# ResellTrack ProGuard rules

# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }
-keep class com.reselltrack.app.** { *; }

# Keep WebView JS interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep JavaScript-accessible methods
-keepattributes JavascriptInterface
-keepattributes *Annotation*

# Suppress warnings for missing classes
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Keep line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
