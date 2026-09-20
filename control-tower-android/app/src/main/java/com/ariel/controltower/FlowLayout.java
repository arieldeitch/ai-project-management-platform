package com.ariel.controltower;

import android.content.Context;
import android.view.View;
import android.view.ViewGroup;

/**
 * Chips and small buttons wrap onto the next line instead of being clipped: a minimal RTL-aware flow layout.
 * Children keep their measured width; rows start at the end edge (right) because every screen is RTL.
 */
public final class FlowLayout extends ViewGroup {
    private final int hGap, vGap;

    public FlowLayout(Context c, int hGapPx, int vGapPx) {
        super(c);
        hGap = hGapPx;
        vGap = vGapPx;
    }

    @Override
    protected void onMeasure(int widthSpec, int heightSpec) {
        int width = MeasureSpec.getSize(widthSpec) - getPaddingLeft() - getPaddingRight();
        int x = 0, y = 0, rowH = 0;
        for (int i = 0; i < getChildCount(); i++) {
            View v = getChildAt(i);
            if (v.getVisibility() == GONE) continue;
            measureChild(v, MeasureSpec.makeMeasureSpec(width, MeasureSpec.AT_MOST), MeasureSpec.UNSPECIFIED);
            int w = v.getMeasuredWidth(), h = v.getMeasuredHeight();
            if (x > 0 && x + w > width) { x = 0; y += rowH + vGap; rowH = 0; }
            x += w + hGap;
            rowH = Math.max(rowH, h);
        }
        int height = y + rowH + getPaddingTop() + getPaddingBottom();
        setMeasuredDimension(MeasureSpec.getSize(widthSpec), resolveSize(height, heightSpec));
    }

    @Override
    protected void onLayout(boolean changed, int l, int t, int r, int b) {
        int width = r - l - getPaddingLeft() - getPaddingRight();
        int x = 0, y = getPaddingTop(), rowH = 0;
        for (int i = 0; i < getChildCount(); i++) {
            View v = getChildAt(i);
            if (v.getVisibility() == GONE) continue;
            int w = v.getMeasuredWidth(), h = v.getMeasuredHeight();
            if (x > 0 && x + w > width) { x = 0; y += rowH + vGap; rowH = 0; }
            // RTL: first child sits at the right edge.
            int right = getPaddingLeft() + width - x;
            v.layout(right - w, y, right, y + h);
            x += w + hGap;
            rowH = Math.max(rowH, h);
        }
    }
}
