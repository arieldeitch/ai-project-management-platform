package com.ariel.controltower;

import android.os.Build;
import android.view.View;
import android.view.WindowInsets;

/** Android 15 draws edge-to-edge for targetSdk 35: keep content out from under the status/navigation bars. */
final class Insets {
    private Insets() {}

    /** [left, top, right, bottom] system-bar insets, version-safe. */
    static int[] bars(WindowInsets insets) {
        if (Build.VERSION.SDK_INT >= 30) {
            android.graphics.Insets b = insets.getInsets(WindowInsets.Type.systemBars());
            return new int[]{b.left, b.top, b.right, b.bottom};
        }
        return new int[]{insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom()};
    }

    static void applySystemBars(View root) {
        final int left = root.getPaddingLeft(), top = root.getPaddingTop(), right = root.getPaddingRight(), bottom = root.getPaddingBottom();
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int[] b = bars(insets);
            v.setPadding(left + b[0], top + b[1], right + b[2], bottom + b[3]);
            return insets;
        });
        root.requestApplyInsets();
    }
}
