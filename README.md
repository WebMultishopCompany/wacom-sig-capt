# Wacom SigCapt
Wacom SigCaptX SDK wrapper created for easier access to basic functionallity of signature capture device (STU-500).

It allows requesting signature and getting signature as transparent PNG image in base64 format.

## Documentation

### Options (passed to `init()` method):

- `licenceString` To remove "Evalute" message from screen, you will need valid Wacom licence string. Defaults to empty string.
- `bitmapSettings.width` Width of rendered signature image. Defaults to STU-500 that has width of `640` px.
- `bitmapSettings.height` Height of rendered signature image. Defaults to STU-500 that has height of `480` px.
- `bitmapSettings.paddingX` Padding of X axis for rendered signature image. Defaults to `0`.
- `bitmapSettings.paddingY` Padding of Y axis for rendered signature image. Defaults to `0`.
- `bitmapSettings.inkWidth` Ink width for rendered signature image. Defaults to `0.7`.
- `output` Output debug data. If `true`, it will log to console, as alternative, you can provide your own function to output debug info. Defaults to `false`.
- `sdkDetectTimeout` Timeout value in miliseconds for reaching SDK on client computer. Defaults to `1500`
- `servicePort` Service port value for SDK on client computer. Defaults to `8000`.

### Methods (acessible via `window.SigCapt` object):

- `init(options, callback)` Initializes engine with given options
- `clearSignature()` Clears signature from screen
- `capture()` Starts signature capture process
- `displaySignatureDetails()` Requests signature details
- `setSignatureText(text)` Sets signature text
- `restartSession()` Restarts engine session

### Events (triggered on `$(window)` object):

- `sigCapt:ready` Triggered when engine connection to SDK on client computer is ready.
- `sigCapt:noSdkDetected` Triggered if SDK was not detected during engine init sequence.
- `sigCapt:restartSession` Triggered when engine restart was requested.
- `sigCapt:renderBitmap` Triggered when signature was captured and bitmap image is ready. First argument is image string in base64 format.
- `sigCapt:txtSignatureUpdated` Triggered when signature text were updated.
- `sigCapt:captureCancelled` Triggered when user canceled signature process.
- `sigCapt:captureError` Triggered when any other error is returned. First arguments is error message, second is error code (see below).
- `sigCapt:signatureDetails` Triggered after signature details was requested. First three arguments are who, why and when.

### Error codes (received via `sigCapt:captureError` events):

- `100` DynCaptPadError (device not connected)
- `101` DynCaptError (could not capture)
- `102` DynCaptIntegrityKeyInvalid (invalid integrity key)
- `103` DynCaptError (invalid licence)
- `200` DynCaptAbort (could not parse contents)

## Example

Include vendor scripts and library
```HTML
<script type="text/javascript" src="vendor/base64.js"></script>
<script type="text/javascript" src="vendor/wgssSigCaptX.js"></script>
<script type="text/javascript" src="SigCapt.js"></script>
```

Initialize SigCapt
```JavaScript
window.SigCapt.init({
   licenceString: '\* Wacom licence string goes here *\'
});
```

Listen for captures
```JavaScript
$(window).on('sigCapt:renderBitmap', function(e, imageBase64) {
    console.log('Signature captured:', imageBase64);
});
```

Request capture
```JavaScript
window.SigCapt.capture(
    'Gordon Freeman',
    'By signing below, you agree that your signature will be stored digitally.'
);
```
