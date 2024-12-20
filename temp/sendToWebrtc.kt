mediaProjectionManager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
mediaProjection = mediaProjectionManager.getMediaProjection(resultCode!!, permissionIntent!!)
mediaProjection?.registerCallback(object : MediaProjection.Callback() {
    override fun onStop() {
        super.onStop()
        Log.d(TAG, "onStop: Stop session")
    }
}, null)
val (screenWidthPixels, screenHeightPixels, densityDpi) = getDisplayMetrics()
val imageReader = getImageReader(screenWidthPixels, screenHeightPixels)
virtualDisplay = mediaProjection?.createVirtualDisplay(
    "ScreenCapture",
    screenWidthPixels,
    screenHeightPixels,
    densityDpi,
    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
    imageReader.surface,
    null,
    null
)
imageReader.setOnImageAvailableListener({ reader ->
    val image = reader.acquireLatestImage()
    image?.let { data ->
        sendImageToWebRTC(data)
        data.close()
    }
}, null)
val videoSource = peerConnectionFactory.createVideoSource(false)
localVideoTrack = peerConnectionFactory.createVideoTrack("local_video", videoSource)
localStream = peerConnectionFactory.createLocalMediaStream("local_stream")
localStream?.addTrack(localVideoTrack)
peerConnection?.addTrack(localVideoTrack, listOf(localStream?.id ?: "stream"))