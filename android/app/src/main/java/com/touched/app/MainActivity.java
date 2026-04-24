package com.touched.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsetsController;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. WebView를 시스템 바 영역까지 확장 (edge-to-edge)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            //noinspection deprecation
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        }

        // 2. 시스템 바 색상 + 아이콘 다크 설정
        applySystemBars();
    }

    @Override
    public void onResume() {
        super.onResume();
        applySystemBars();
    }

    private void applySystemBars() {
        getWindow().setStatusBarColor(Color.parseColor("#EDE4DA"));
        getWindow().setNavigationBarColor(Color.parseColor("#EDE4DA"));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                    WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                    WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                );
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            //noinspection deprecation
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR |
                View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            );
        }
    }
}
