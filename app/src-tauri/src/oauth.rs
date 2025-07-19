use tauri::Emitter;

#[tauri::command]
pub async fn start_oauth_server(window: tauri::Window) -> Result<u16, String> {
    use tauri_plugin_oauth::{start_with_config, OauthConfig};
    use std::borrow::Cow;
    
    let config = OauthConfig {
        ports: Some(vec![9420, 9421, 9422, 9423, 9424]),
        response: Some(Cow::Borrowed(r#"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Authentication Successful</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        p { color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>✓ Authentication Successful</h1>
        <p>You can close this window and return to Gorlami.</p>
    </div>
</body>
</html>
"#)),
    };
    
    start_with_config(config, move |url| {
        // Emit the callback URL to the frontend
        let _ = window.emit("oauth://callback", url.as_str());
    })
    .map_err(|e| e.to_string())
}