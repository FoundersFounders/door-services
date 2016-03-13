-- FoundersFounders Building Door Open

-- 1. Connect to wifi
function configure_wifi()
  wifi.setmode(wifi.STATION)
  wifi.sta.config("<WIFI_NAME>", "<WIFI_PASSWORD>")
end

-- 2. Configure GPIO
gpio_pin = 2 --gpio4
gpio.mode(gpio_pin, gpio.OUTPUT)
gpio.write(gpio_pin, gpio.LOW)

-- 3. Set-up timer
function setup_wifi()
  if wifi.sta.getip() then
    connect_to_sf_service()
  else
    wifi.sta.eventMonReg(wifi.STA_GOTIP, function()
      wifi.sta.eventMonStop()
      connect_to_sf_service()
    end)
    wifi.sta.eventMonStart()
    configure_wifi()
  end
end

setup_wifi()

function connect_to_sf_service()
  print("Connecting to backend service...")
  sk = net.createConnection(net.TCP, 0)
  sk:on("receive", function(sck, c)
    sk:send(open_door(sck, c))
    print(c)
  end)
  sk:connect(8300, "<BACKEND_SERVICE>")
  sk:on("connection", function(sck, c) print('got connection') end)
  sk:on("disconnection", setup_wifi)
end

-- 4. Handle door relay
door_currently_open = false
function open_door(sck, duration)
    duration = tonumber(duration)
    if (duration == nil) then
        return "0|Invalid number."
    end
    if (door_currently_open == true) then
        return "1|Door is already open!"
    else
        door_currently_open = true
        gpio.write(gpio_pin, gpio.HIGH)
        tmr.alarm(1, duration, 0, function()
            gpio.write(gpio_pin, gpio.LOW)
            print("Door is closed.")
            sck:send("2|Door is closed.")
            tmr.stop(1)
            door_currently_open = false
        end)
        return "3|Door is now open for " .. duration .. "."
    end
end
