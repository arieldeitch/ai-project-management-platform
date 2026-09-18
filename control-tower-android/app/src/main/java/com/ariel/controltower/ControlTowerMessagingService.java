package com.ariel.controltower;

import android.content.SharedPreferences;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Receives FCM messages for Control Tower.
 *
 * Payload contract (data keys, all optional): title, body, target, project_id, event.
 * The server sends both a notification block and data so that a tap always routes
 * through MainActivity with the routing extras preserved.
 */
public class ControlTowerMessagingService extends FirebaseMessagingService {

    @Override
    public void onNewToken(String token) {
        SharedPreferences prefs = getSharedPreferences("control_tower_session", MODE_PRIVATE);
        PushNotifications.registerToken(this, prefs, token);
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        String title = data.get("title");
        String body = data.get("body");
        if (message.getNotification() != null) {
            if (title == null) title = message.getNotification().getTitle();
            if (body == null) body = message.getNotification().getBody();
        }
        PushNotifications.show(this, title, body, data);
    }
}
