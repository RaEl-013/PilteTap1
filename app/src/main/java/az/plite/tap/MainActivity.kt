package az.plite.tap

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
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.view.WindowManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import java.io.File
import java.io.FileOutputStream
import java.util.Base64

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private var fileCb: ValueCallback<Array<Uri>>? = null

    // assets/ qovluğunu https://appassets.androidplatform.net/assets/ ünvanı kimi verir
    // (file:// əvəzinə). Beləliklə .wasm / .mjs faylları normal yüklənir.
    private val assetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    private val pickFile =
        registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()) { r ->
            val cb = fileCb ?: return@registerForActivityResult
            fileCb = null
            val uris = mutableListOf<Uri>()
            val clip = r.data?.clipData
            if (clip != null) {
                for (i in 0 until clip.itemCount) uris.add(clip.getItemAt(i).uri)
            } else {
                r.data?.data?.let { uris.add(it) }
            }
            cb.onReceiveValue(if (uris.isEmpty()) null else uris.toTypedArray())
        }

    private val askCam =
        registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) {}

    inner class KeramoBridge {
        @JavascriptInterface
        fun saveBackup(b64: String, name: String) {
            runOnUiThread {
                try {
                    val bytes = Base64.getDecoder().decode(b64)
                    if (Build.VERSION.SDK_INT >= 29) {
                        val vals = android.content.ContentValues().apply {
                            put(MediaStore.Downloads.DISPLAY_NAME, name)
                            put(MediaStore.Downloads.MIME_TYPE, "application/json")
                            put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                        }
                        val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, vals)!!
                        contentResolver.openOutputStream(uri)!!.use { it.write(bytes) }
                        showToast("Yadda saxlanıldı: Download/$name")
                    } else {
                        val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                        dir.mkdirs()
                        val file = File(dir, name)
                        FileOutputStream(file).use { it.write(bytes) }
                        showToast("Yadda saxlanıldı: " + file.absolutePath)
                    }
                } catch (e: Exception) {
                    showToast("Xəta: " + e.message)
                }
            }
        }

        @JavascriptInterface
        fun toast(msg: String) {
            runOnUiThread { showToast(msg) }
        }
    }

    private fun showToast(msg: String): Unit {
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Proqram açıq olduqca ekran sönməsin / avtomatik bloklanmasın
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) {
            askCam.launch(Manifest.permission.CAMERA)
        }

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
                if (url.startsWith("data:")) {
                    saveDataUrl(url)
                    return true
                }
                return false
            }

            // Səhifə yüklənəndən sonra plite modullarını (frame-fix, smart-search və s.) özü yükləyir.
            // index.html-ə skript sətirləri əlavə etmək lazım deyil; səhvən yapışdırılmış izah mətnini də silir.
            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                view.evaluateJavascript(LOADER_JS, null)
            }

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val resp = assetLoader.shouldInterceptRequest(request.url) ?: return null
                val path = request.url.path ?: return resp
                // .mjs / .wasm üçün düzgün MIME tipi (yoxsa brauzer modulu və wasm-ı rədd edir)
                val mime = when {
                    path.endsWith(".mjs") || path.endsWith(".js") -> "text/javascript"
                    path.endsWith(".wasm") -> "application/wasm"
                    else -> return resp
                }
                val enc = if (mime == "application/wasm") null else "UTF-8"
                return WebResourceResponse(mime, enc, resp.data)
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(req: PermissionRequest) {
                runOnUiThread {
                    if (req.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        req.grant(req.resources)
                    } else {
                        req.deny()
                    }
                }
            }

            override fun onShowFileChooser(
                w: WebView,
                cb: ValueCallback<Array<Uri>>,
                p: FileChooserParams
            ): Boolean {
                fileCb?.onReceiveValue(null)
                fileCb = cb
                return try {
                    pickFile.launch(p.createIntent())
                    true
                } catch (e: Exception) {
                    fileCb = null
                    false
                }
            }
        }
        web.setDownloadListener { url, _, _, _, _ ->
            if (url.startsWith("data:")) saveDataUrl(url)
        }
        // file:///android_asset/index.html əvəzinə:
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    private fun saveDataUrl(url: String) {
        try {
            val comma = url.indexOf(',')
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
            showToast("Yadda saxlanıldı: Download/$name")
        } catch (e: Exception) {
            showToast("Xəta: " + e.message)
        }
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    override fun onBackPressed() {
        if (this::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }
}

private const val LOADER_JS = """
(function () {
  if (window.__plite_loader) return;
  if (typeof window.render !== 'function') return;
  window.__plite_loader = 1;
  try {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false), n, rm = [];
    while ((n = w.nextNode())) {
      var t = n.nodeValue || '';
      if (/index\.html \(app\/src\/main\/assets\/index\.html\)|BU SIRA ilə|Silinməlidir|ort-config\.js faylı|ort-config\.js sətri|-dən əvvəl, əsas|blokundan SONRA|ƏN ƏVVƏL, label-shot|index-html-skriptler/.test(t)) rm.push(n);
    }
    rm.forEach(function (x) { if (x.parentNode) x.parentNode.removeChild(x); });
  } catch (e) {}
  var L = ['plite-config', 'ort-fix', 'frame-fix', 'speed-fix', 'sticker-ocr', 'smart-search', 'auto-camera', 'settings-panel', 'label-shot'];
  (function next(i) {
    if (i >= L.length) return;
    var R = window.PLITE_READY || {};
    if (R[L[i]]) { next(i + 1); return; }
    var s = document.createElement('script');
    s.src = L[i] + '.js';
    s.onload = s.onerror = function () { next(i + 1); };
    document.body.appendChild(s);
  })(0);
})();
"""
