/**
 * Wacom SigCaptX SDK wrapper created for easier access to basic functionallity
 * of signature capture device (STU-500).
 * 
 * It allows requesting signature and getting signature as transparent PNG image in base64 format.
 * 
 * Options (passed to `init()` method):
 * 
 * `licenceString` To remove "Evalute" message from screen, you will need valid Wacom licence string. Defaults to empty string.
 * `bitmapSettings.width` Width of rendered signature image. Defaults to STU-500 that has width of `640` px.
 * `bitmapSettings.height` Height of rendered signature image. Defaults to STU-500 that has height of `480` px.
 * `bitmapSettings.paddingX` Padding of X axis for rendered signature image. Defaults to `0`.
 * `bitmapSettings.paddingY` Padding of Y axis for rendered signature image. Defaults to `0`.
 * `bitmapSettings.inkWidth` Ink width for rendered signature image. Defaults to `0.7`.
 * `output` Output debug data. If `true`, it will log to console, as alternative, you can provide your own function to output debug info. Defaults to `false`.
 * `sdkDetectTimeout` Timeout value in miliseconds for reaching SDK on client computer. Defaults to `1500`
 * `servicePort` Service port value for SDK on client computer. Defaults to `8000`.
 * 
 * Methods (acessible via `window.SigCapt` object):
 * 
 * `init(options, callback)` Initializes engine with given options
 * `clearSignature()` Clears signature from screen
 * `capture()` Starts signature capture process
 * `displaySignatureDetails()` Requests signature details
 * `setSignatureText(text)` Sets signature text
 * `restartSession()` Restarts engine session
 * 
 * Events (triggered on `$(window)` object):
 * 
 * `sigCapt:ready` Triggered when engine connection to SDK on client computer is ready.
 * `sigCapt:noSdkDetected` Triggered if SDK was not detected during engine init sequence.
 * `sigCapt:restartSession` Triggered when engine restart was requested.
 * `sigCapt:renderBitmap` Triggered when signature was captured and bitmap image is ready. First argument is image string in base64 format.
 * `sigCapt:txtSignatureUpdated` Triggered when signature text were updated.
 * `sigCapt:captureCancelled` Triggered when user canceled signature process.
 * `sigCapt:captureError` Triggered when any other error is returned. First arguments is error message, second is error code (see below).
 * `sigCapt:signatureDetails` Triggered after signature details was requested. First three arguments are who, why and when.
 * 
 * Error codes (received via `sigCapt:captureError` events):
 * 
 * `100` DynCaptPadError (device not connected)
 * `101` DynCaptError (could not capture)
 * `102` DynCaptIntegrityKeyInvalid (invalid integrity key)
 * `103` DynCaptError (invalid licence)
 * `200` DynCaptAbort (could not parse contents)
 * 
 * @link http://www.webmultishop.com/
 * @copyright 2017 SIA "Web Multishop Company"
 * @license http://www.webmultishop.com/license/
 * @author Nils Lindentals <nils@webmultishop.com>
 */
(function($) {
    var widget = {
        settings: {
            licenceString: '',
            bitmapSettings: {
                width: 640,
                height: 480,
                paddingX: 0,
                paddingY: 0,
                inkWidth: 0.7
            },
            output: false,
            sdkDetectTimeout: 1500,
            // pass the starting service port	number as configured in the registry
            servicePort: 8000
        },
        data: {
            sdk: null,
            txtSignature: null,
            who: null,
            why: null,
            when: null,
            imageBase64: null
        },
        init: function(options, callback) {
            widget.settings = $.extend(
                true,
                widget.settings,
                options
            );
            restartSession(callback);
        },
        clearSignature: ClearSignature,
        capture: capture,
        displaySignatureDetails: DisplaySignatureDetails,
        setSignatureText: SetSignatureText,
        restartSession: restartSession
    };
    window.SigCapt = widget;

    function Exception(txt) {
        print("Exception: " + txt);
    }
    function print(txt) {
        if (widget.settings.output === true) {
            console.info('SigCapt:', txt);
        } else if (Object.prototype.toString.call(widget.settings.output) === '[object Function]') {
            widget.settings.output(txt);
        }
    }

    var sigObj = null;
    var sigCtl = null;
    var dynCapt = null;

    function init(options, callback) {
        widget.settings = $.extend(
            true,
            widget.settings,
            options
        );
        restartSession(callback);
        return widget;
    }

    function restartSession(callback) {
        $(window).trigger(
            'sigCapt:restartSession',
            [
                widget
            ]
        );
        widget.data.sdk = null;
        sigObj = null;
        sigCtl = null;
        dynCapt = null;
        var timeout = setTimeout(timedDetect, widget.settings.sdkDetectTimeout);
        widget.data.sdk = new WacomGSS_SignatureSDK(onDetectRunning, widget.settings.servicePort);
        widget.data.txtSignature = null;
        widget.data.who = null;
        widget.data.why = null;
        widget.data.when = null;
        widget.data.imageBase64 = null;

        function timedDetect() {
            if (widget.data.sdk.running) {
                print("Signature SDK Service detected.");
                start();
            }
            else {
                print("Signature SDK Service not detected.");
                noSdkDetected();
            }
        }


        function onDetectRunning() {
            if (widget.data.sdk.running) {
                print("Signature SDK Service detected.");
                clearTimeout(timeout);
                start();
            }
            else {
                print("Signature SDK Service not detected.");
            }
        }

        function start() {
            if (widget.data.sdk.running) {
                sigCtl = new widget.data.sdk.SigCtl(onSigCtlConstructor);
            }
        }

        function noSdkDetected() {
            $(window).trigger(
                'sigCapt:noSdkDetected',
                [
                    widget
                ]
            );
        }

        //noinspection JSUnusedLocalSymbols
        function onSigCtlConstructor(sigCtlV, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                if (widget.settings.licenceString.length > 0) {
                    sigCtl.PutLicence(widget.settings.licenceString, onSigCtlPutLicence);
                } else {
                    dynCapt = new widget.data.sdk.DynamicCapture(onDynCaptConstructor);
                }
            }
            else {
                print("SigCtl constructor error: " + status);
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onSigCtlPutLicence(sigCtlV, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                dynCapt = new widget.data.sdk.DynamicCapture(onDynCaptConstructor);
            }
            else {
                print("SigCtl constructor error: " + status);
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onDynCaptConstructor(dynCaptV, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                sigCtl.GetSignature(onGetSignature);
            }
            else {
                print("DynCapt constructor error: " + status);
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onGetSignature(sigCtlV, sigObjV, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                sigObj = sigObjV;
                sigCtl.GetProperty("Component_FileVersion", onSigCtlGetProperty);
            }
            else {
                print("SigCapt GetSignature error: " + status);
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onSigCtlGetProperty(sigCtlV, property, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                print("DLL: flSigCOM.dll	v" + property.text);
                dynCapt.GetProperty("Component_FileVersion", onDynCaptGetProperty);
            }
            else {
                print("SigCtl GetProperty error: " + status);
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onDynCaptGetProperty(dynCaptV, property, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                print("DLL: flSigCapt.dll v" + property.text);
                print("Ready.");
                if ('function' === typeof callback) {
                    callback();
                }
                $(window).trigger(
                    'sigCapt:ready',
                    [
                        widget
                    ]
                );
            }
            else {
                print("DynCapt GetProperty error: " + status);
            }
        }
    }

    function setTxtSignature(text) {
        if (widget.data.txtSignature !== text) {
            widget.data.txtSignature = text;
            $(window).trigger(
                'sigCapt:txtSignatureUpdated',
                [
                    text,
                    widget
                ]
            );
        }
    }
    function capture(whoText, whyText) {
        if (widget.data.sdk === null || !widget.data.sdk.running || null === dynCapt) {
            print("Session error. Restarting the session.");
            restartSession(function() { capture(whoText, whyText); });
            return;
        }
        widget.data.imageBase64 = null;
        dynCapt.Capture(sigCtl, whoText, whyText, null, null, onDynCaptCapture);

        //noinspection JSUnusedLocalSymbols
        function onDynCaptCapture(dynCaptV, SigObjV, status) {
            if (widget.data.sdk.ResponseStatus.INVALID_SESSION === status) {
                print("Error: invalid session. Restarting the session.");
                restartSession(function() { capture(whoText, whyText); });
            }
            else {
                if (widget.data.sdk.DynamicCaptureResult.DynCaptOK !== status) {
                    print("Capture returned: " + status);
                }
                var error = false;
                switch (status) {
                    case widget.data.sdk.DynamicCaptureResult.DynCaptOK:
                        sigObj = SigObjV;
                        print("Signature captured successfully");
                        renderBitmap(sigObj, onRenderBitmap);
                        break;
                    case widget.data.sdk.DynamicCaptureResult.DynCaptCancel:
                        print("Signature capture cancelled");
                        $(window).trigger(
                            'sigCapt:captureCancelled',
                            [
                                widget
                            ]
                        );
                        break;
                    case widget.data.sdk.DynamicCaptureResult.DynCaptPadError:
                        error = ["No capture service available", status];
                        break;
                    case widget.data.sdk.DynamicCaptureResult.DynCaptError:
                        error = ["Tablet Error", status];
                        break;
                    case widget.data.sdk.DynamicCaptureResult.DynCaptIntegrityKeyInvalid:
                        error = ["The integrity key parameter is invalid (obsolete)", status];
                        break;
                    case widget.data.sdk.DynamicCaptureResult.DynCaptNotLicensed:
                        error = ["No valid Signature Capture licence found", status];
                        break;
                    case widget.data.sdk.DynamicCaptureResult.DynCaptAbort:
                        error = ["Error - unable to parse document contents", status];
                        break;
                    default:
                        error = ["Capture Error", status];
                        break;
                }
                if (error !== false) {
                    error[2] = widget;
                    $(window).trigger('sigCapt:captureError', error);
                    print("Error (" + error[1] + "): " + error[0]);
                }
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onRenderBitmap(sigObjV, bmpObj, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                widget.data.imageBase64 = 'data:image/png;base64,' + bmpObj;
                $(window).trigger(
                    'sigCapt:renderBitmap',
                    [
                        widget.data.imageBase64,
                        sigObjV,
                        widget
                    ]
                );
                sigObj.GetSigText(onGetSigText);
            }
            else {
                print("Signature Render Bitmap error: " + status);
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onGetSigText(sigObjV, text, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                setTxtSignature(text);
            }
            else {
                print("Signature Render Bitmap error: " + status);
            }
        }

    }
    function DisplaySignatureDetails() {
        if (!widget.data.sdk.running || null === sigObj) {
            print("Session error. Restarting the session.");
            restartSession(DisplaySignatureDetails);
            return;
        }
        widget.data.who = null;
        widget.data.why = null;
        widget.data.when = null;
        sigObj.GetIsCaptured(onGetIsCaptured);

        function onGetIsCaptured(sigObj, isCaptured, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                if (!isCaptured) {
                    print("No signature has been captured yet.");
                    return;
                }
                sigObj.GetWho(onGetWho);
            }
            else {
                print("Signature GetWho error: " + status);
                if (widget.data.sdk.ResponseStatus.INVALID_SESSION === status) {
                    print("Session error. Restarting the session.");
                    restartSession(DisplaySignatureDetails);
                }
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onGetWho(sigObjV, who, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                print("	Name:	 " + who);
                widget.data.who = who;
                var tz = widget.data.sdk.TimeZone.TimeLocal;
                sigObj.GetWhen(tz, onGetWhen);
            }
            else {
                print("Signature GetWho error: " + status);
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onGetWhen(sigObjV, when, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                print("	Date:	 " + when.toString());
                widget.data.when = when.toString();
                sigObj.GetWhy(onGetWhy);
            }
            else {
                print("Signature GetWhen error: " + status);
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onGetWhy(sigObjV, why, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                print("	Reason: " + why);
                widget.data.why = why;
                $(window).trigger(
                    'sigCapt:signatureDetails',
                    [
                        widget.data.who,
                        widget.data.why,
                        widget.data.when,
                        widget
                    ]
                );
            }
            else {
                print("Signature GetWhy error: " + status);
            }
        }

    }

    function AboutBox() {
        if (!widget.data.sdk.running || null === sigCtl) {
            print("Session error. Restarting the session.");
            restartSession(AboutBox);
            return;
        }
        sigCtl.AboutBox(onAboutBox);

        //noinspection JSUnusedLocalSymbols
        function onAboutBox(sigCtlV, status) {
            if (widget.data.sdk.ResponseStatus.OK !== status) {
                print("AboutBox error: " + status);
                if (widget.data.sdk.ResponseStatus.INVALID_SESSION === status) {
                    print("Session error. Restarting the session.");
                    restartSession(AboutBox);
                }
            }
        }
    }

    function ClearSignature() {
        if (null === sigObj) {
            restartSession(ClearSignature);
            return;
        }
        sigObj.Clear(onClearSig);

        //noinspection JSUnusedLocalSymbols
        function onClearSig(sigObjV, status) {
            if (widget.data.sdk.ResponseStatus.OK !== status) {
                print("ClearSignature() error: " + status);
                if (widget.data.sdk.ResponseStatus.INVALID_SESSION === status) {
                    print("Session error. Restarting the session.");
                    restartSession(ClearSignature);
                }
            }
        }
    }
    function renderBitmap(sigObj, onRenderBitmap) {
        sigObj.RenderBitmap(
            "png",
            widget.settings.bitmapSettings.width,
            widget.settings.bitmapSettings.height,
            widget.settings.bitmapSettings.inkWidth,
            0x00000000,
            0x00FFFFFF,
                widget.data.sdk.RBFlags.RenderOutputBase64 |
                widget.data.sdk.RBFlags.RenderColor32BPP | 
                widget.data.sdk.RBFlags.RenderBackgroundTransparent,
            widget.settings.bitmapSettings.paddingX,
            widget.settings.bitmapSettings.paddingY,
            onRenderBitmap
        );
    }
    function SetSignatureText(text) {
        if (null === sigObj) {
            restartSession(function() {
                SetSignatureText(text);
            });
            return;
        }
        sigObj.PutSigText(text, onPutSigText);

        //noinspection JSUnusedLocalSymbols
        function onPutSigText(sigObjV, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                renderBitmap(sigObj, onRenderBitmap);
            }
            else {
                print("SetSignatureText() error: " + status);
                if (widget.data.sdk.ResponseStatus.INVALID_SESSION === status) {
                    print("Session error. Restarting the session.");
                    restartSession(function() { SetSignatureText(text); });
                }
            }
        }

        //noinspection JSUnusedLocalSymbols
        function onRenderBitmap(sigObjV, bmpObj, status) {
            if (widget.data.sdk.ResponseStatus.OK === status) {
                widget.data.imageBase64 = 'data:image/png;base64,' + bmpObj;
                $(window).trigger(
                    'sigCapt:renderBitmap',
                    [
                        widget.data.imageBase64,
                        sigObjV,
                        widget
                    ]
                );
            }
            else {
                print("Signature Render Bitmap error: " + status);
            }
        }
    }
})(jQuery);
