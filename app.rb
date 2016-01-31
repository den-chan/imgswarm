require 'faye/websocket'

module Imgswarm
  class Backend
    def initialize app
    end

    def call env
      if Faye::WebSocket.websocket? env
        ws = Faye::WebSocket.new env, nil, { ping: 15 }
        puts env

        ws.on :open do |event|
        end
        ws.on :message do |event|
        end
        ws.on :close do |event|
        end

        ws.rack_response
      else
        # error
      end
    end
  end
end
