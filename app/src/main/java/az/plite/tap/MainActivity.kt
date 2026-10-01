package az.keramobazar.plitetap
// QEYD: package sətri app/build.gradle.kts faylındakı "namespace" ilə EYNİ olmalıdır!
// Eksikdirsə, oradakı namespace-i bura yazın.

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.io.FileOutputStream
import java.util.Base64

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private var fileCb: ValueCallback<Array<Uri>>? = null

    private val pickFile =
        registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()) { r ->
            val cb = fileCb ?: return@registerForActivityResult
            fileCb = null
            val uris = mutableListOf<Uri>()
            val clip = r.data?.clipData
            if (clip != null) for (i in 0 until clip.itemCount) uris.add(clip.getItemAt(i).uri)
            else r.data?.data?.let { uris.add(it) }
            cb.onReceiveValue(if (uris.isEmpty()) null else uris.toTypedArray())
        }

    private val askCam =
        registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) {}

    /** JS körpüsü: backup faylını telefonun Downloads qovluğuna yazır. */
    inner class KeramoBridge {
        @JavascriptInterface
        fun saveBackup(b64: String, name: String) {
            runOnUiThread {
                try {
                    val bytes = Base64.getDecoder().decode(b64)
                    val file: File = if (Build.VERSION.SDK_INT >= 29) {
                        val vals = android.content.ContentValues().apply {
                            put(MediaStore.Downloads.DISPLAY_NAME, name)
                            put(MediaStore.Downloads.MIME_TYPE, "application/json")
                            put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                        }
                        val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, vals)!!
                        contentResolver.openOutputStream(uri)!!.use { it.write(bytes) }
                        toast("Yadda saxlanıldı: Download/$name")
                        return@runOnUiThread
                    } else {
                        val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                        dir.mkdirs()
                        File(dir, name)
                    }
                    FileOutputStream(file).use { it.write(bytes) }
                    toast("Yadda saxlanıldı: " + file.absolutePath)
                } catch (e: Exception) {
                    toast("Xəta: " + e.message)
                }
            }
        }

        @JavascriptInterface
        fun toast(msg: String) = runOnUiThread { toast(msg) }
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) askCam.launch(Manifest.permission.CAMERA)

        web = WebView(this)
        setContentView(web)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            mediaPlaybackRequiresUserGesture = false
        }
        web.addJavascriptInterface(KeramoBridge(), "Keramo")
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(v: WebView, url: String): Boolean {
                // data: backup keçidlərini saxla
                if (url.startsWith("data:")) { saveDataUrl(url); return true }
                return false
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(req: PermissionRequest) {
                runOnUiThread {
                    if (req.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) req.grant(req.resources)
                    else req.deny()
                }
            }

            override fun onShowFileChooser(w: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams): Boolean {
                fileCb?.onReceiveValue(null)
                fileCb = cb
                val i = p.createIntent()
                try { pickFile.launch(i) } catch (e: Exception) {
                    fileCb = null
                    return false
                }
                return true
            }
        }
        web.setDownloadListener { url, _, _, _, _ -> if (url.startsWith("data:")) saveDataUrl(url) }
        web.loadUrl("file:///android_asset/index.html")
    }

    /** data:application/json;base64,... keçidini fayl kimi saxlayır. */
    private fun saveDataUrl(url: String) {
        try {
            val comma = url.indexOf(',')
            val meta = url.substring(0, comma)
            val name = "keramo-backup-" + System.currentTimeMillis() + ".json"
            val bytes = Base64.getDecoder().decode(url.substring(comma + 1))
            if (Build.VERSION.SDK_INT >= 29) {
                val vals = android.content.ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, name)
                    put(MediaStore.Downloads.MIME_TYPE, "application/json")
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, vals)!!
                contentResolver.openOutputStream(uri)!!.use { it.write(bytes) }
            } else {
                val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                dir.mkdirs()
                FileOutputStream(File(dir, name)).use { it.write(bytes) }
            }
            toast("Yadda saxlanıldı: Download/$name")
        } catch (e: Exception) { toast("Xəta: " + e.message) }
    }

    override fun onDestroy() { web.destroy(); super.onDestroy() }

    override fun onBackPressed() {
        if (this::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }
}
