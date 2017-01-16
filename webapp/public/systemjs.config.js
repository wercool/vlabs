(function (global) {
    System.config({
        // map tells the System loader where to look for things
        map: {
            // actual app is within the app folder
            app: 'js/app',

            // angular bundles
            '@angular/core':                        'js/vendor/@angular/core/bundles/core.umd.js',
            '@angular/common':                      'js/vendor/@angular/common/bundles/common.umd.js',
            '@angular/compiler':                    'js/vendor/@angular/compiler/bundles/compiler.umd.js',
            '@angular/platform-browser':            'js/vendor/@angular/platform-browser/bundles/platform-browser.umd.js',
            '@angular/platform-browser-dynamic':    'js/vendor/@angular/platform-browser-dynamic/bundles/platform-browser-dynamic.umd.js',
            '@angular/http':                        'js/vendor/@angular/http/bundles/http.umd.js',
            '@angular/http/testing':                'js/vendor/@angular/http/bundles/http-testing.umd.js',
            '@angular/router':                      'js/vendor/@angular/router/bundles/router.umd.js',
            '@angular/forms':                       'js/vendor/@angular/forms/bundles/forms.umd.js',

            // other libraries
            'rxjs': 'js/vendor/rxjs'
        },
        // packages tells the System loader how to load when no filename and/or no extension
        packages: {
            app: {
                main: './main.js',
                defaultExtension: 'js'
            },
            rxjs: {
                defaultExtension: 'js'
            }
        }
    });
})(this);
