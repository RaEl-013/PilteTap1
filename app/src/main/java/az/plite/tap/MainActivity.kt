package az.plite.tap

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.webkit.WebViewAssetLoader
import java.io.File

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var callback: ValueCallback<Array<Uri>>? = null
    private var camUri: Uri? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    private val cameraPermLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        val req = pendingPermissionRequest
        pendingPermissionRequest = null
        if (req == null) return@registerForActivityResult
        if (granted) req.grant(req.resources) else req.deny()
    }

    private val launcher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        val cb = callback ?: return@registerForActivityResult
        callback = null
        var result: Array<Uri>? = null
        if (r.resultCode == RESULT_OK) {
            val d = r.data
            val clip = d?.clipData
            result = when {
                clip != null -> Array(clip.itemCount) { clip.getItemAt(it).uri }
                d?.data != null -> arrayOf(d.data!!)
                camUri != null -> arrayOf(camUri!!)
                else -> null
            }
        }
        cb.onReceiveValue(result)
    }

    private fun cameraIntent(): Intent? = try {
        val dir = File(cacheDir, "cam").apply { mkdirs() }
        val f = File.createTempFile("cam_", ".jpg", dir)
        camUri = FileProvider.getUriForFile(this, "$packageName.fileprovider", f)
        Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            .putExtra(MediaStore.EXTRA_OUTPUT, camUri)
            .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
    } catch (e: Exception) { null }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true   // IndexedDB üçün
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
                loader.shouldInterceptRequest(request.url)
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(w: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams): Boolean {
                callback?.onReceiveValue(null)
                callback = cb
                val intent = (if (p.isCaptureEnabled) cameraIntent() else null) ?: p.createIntent()
                return try { launcher.launch(intent); true } catch (e: Exception) {
                    callback = null; cb.onReceiveValue(null); false
                }
            }
            override fun onPermissionRequest(request: PermissionRequest) {
                val wantsCamera = request.resources.any { it == PermissionRequest.RESOURCE_VIDEO_CAPTURE }
                if (!wantsCamera) { request.deny(); return }
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA)
                    == PackageManager.PERMISSION_GRANTED
                ) {
                    request.grant(request.resources)
                } else {
                    pendingPermissionRequest = request
                    cameraPermLauncher.launch(Manifest.permission.CAMERA)
                }
            }
        }
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() { if (web.canGoBack()) web.goBack() else super.onBackPressed() }
}
