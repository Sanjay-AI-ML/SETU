package org.setu.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Printer")
public class PrinterPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView webView = getBridge().getWebView();
                    PrintManager printManager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                    String jobName = "SETU Report " + System.currentTimeMillis();
                    PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);
                    
                    if (printManager != null) {
                        printManager.print(jobName, printAdapter, new PrintAttributes.Builder().build());
                        call.resolve();
                    } else {
                        call.reject("PrintManager not available on this device");
                    }
                } catch (Exception e) {
                    call.reject("Printing failed: " + e.getMessage());
                }
            }
        });
    }
}
