require 'sinatra/base'

module Imgswarm
  class App < Sinatra::Base
    get '/' do
      File.read(File.join('public', 'index.html'))
    end
  end
end
