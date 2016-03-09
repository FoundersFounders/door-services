wifi.setmode(wifi.STATION)
wifi.sta.config("<WIFI_NAME>", "<WIFI_PASSWORD>")

function fire_slack_request()
    local door_bell_request =
      "POST /api/chat.postMessage" ..
      "?token=<TOKEN>" ..
      "&channel=<CHANNEL_ID>" ..
      "&username=Doorbell%20Bot" ..
      "&icon_url=http%3a%2f%2fimg.ctrlv.in%2fimg%2f16%2f01%2f21%2f56a0c2a544ad8.png" ..
      "&link_names=1&text=%40here%3a+Someone%20is%20ringing%20the%20door%20bell! HTTP/1.1\r\n" ..
      "Host: <SERVICE_HOST>\r\n" ..
      "Connection: keep-alive\r\nAccept: */*\r\n\r\n"

    conn=net.createConnection(net.TCP, 0)
    conn:on("connection", function(c)
        print("Ding dong!")
        conn:send(door_bell_request)
    end)
    conn:on("sent", function(c)
        print("Sent.")
    end)

    conn:connect(<BACKEND_SERVICE_PORT>, "<BACKEND_SERVICE>")
end

fire_slack_request()

tmr.alarm(0, 20 * 1000, 0, function()
    print("Couldn't make the request, going to sleep.")
    node.dsleep(0)
end)
