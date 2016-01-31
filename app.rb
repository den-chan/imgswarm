require 'faye/websocket'
require 'yajl'

module Imgswarm
  class Backend

    def initialize app
      @config = { maxAnnouncePeers: 1000 }
    end

    def call env
      if Faye::WebSocket.websocket? env
        ws = Faye::WebSocket.new env, nil, { ping: 15 }

        ws.on :open do |event|
          puts [:open]
          @socket = { :peerId => nil, :infoHashes => [] } # TODO: pool
        end

        ws.on :message do |event|
          puts [:message]
          begin
            result = catch (:error) { parseRequest event.data }
            case result
            when String
              ws.send Yajl::Encoder.new.encode({
                :'failure reason' => result,
                :info_hash => @params['info_hash'].pack('H*')
              })
              puts 'warning: ' + result.message
            when Hash
              puts @params
            end
          rescue => e
            puts e.backtrace
          end
        end

        ws.on :close do |event|
          puts [:close, event.code]
        end

        ws.rack_response
      else
        # error
      end
    end

    def parseRequest params
      @params = Yajl::Parser.new.parse StringIO.new(params)
      #@params[:action] = :announce
      @params[:socket] = @socket
      importParam 'info_hash'
      importParam 'peer_id'
      importParam 'to_peer_id' if @params.has_key? 'answer'
      @params['left'] = @params['left'].to_i || Float::INFINITY
      @params['numwant'] = [
        (@params.has_key?('offers') ? @params['offers'].length : 0),
        @config[:maxAnnouncePeers]
      ].min
      @params['compact'] = -1
      @params
    end

    def importParam param
      throw(:error, "Invalid #{param}") unless @params[param].instance_of? String and @params[param].length.equal? 20
      @params[param] = @params[param].unpack('H*').first
    end
  end
end
