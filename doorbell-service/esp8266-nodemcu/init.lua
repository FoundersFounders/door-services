local WIFI_SSID = "<WIFI_SSID>"
local WIFI_PASSWORD = "<WIFI_PASSWORD>"
local BACKEND_SERVICE_URL = "http://<BACKEND_SERVICE_HOST>/api/chat.postMessage" ..
  "?token=<TOKEN>" ..
  "&channel=<CHANNEL_ID>" ..
  "&username=Doorbell%20Bot" ..
  "&icon_url=http%3a%2f%2fimg.ctrlv.in%2fimg%2f16%2f01%2f21%2f56a0c2a544ad8.png" ..
  "&link_names=1" ..
  "&text=%40here%3a+Someone%20is%20ringing%20the%20door%20bell!"

wifi.setmode(wifi.STATION)
wifi.sta.config(WIFI_SSID, WIFI_PASSWORD)

wifi.sta.eventMonReg(wifi.STA_GOTIP, function()
  wifi.sta.eventMonStop()
  
  http.post(BACKEND_SERVICE_URL, nil, nil, function(code, data)
    if code < 0 then
      print("HTTP request failed")
    else
      print("HTTP request success")
      print(code, data)
    end
    node.dsleep(0)
  end)
end)

wifi.sta.eventMonStart()
