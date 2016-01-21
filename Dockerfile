# Based on https://github.com/sashaegorov/docker-alpine-sinatra
FROM gliderlabs/alpine:3.3

MAINTAINER den-chan <den-chan@tuta.io>

RUN echo 'gem: --no-document' >/etc/gemrc
RUN apk-install alpine-sdk openssl-dev ruby-dev \
    ruby ruby-bundler ruby-io-console
RUN gem install bundler

RUN mkdir /usr/app
WORKDIR /usr/app

COPY Gemfile /usr/app/
COPY Gemfile.lock /usr/app/
RUN bundle install

RUN gem clean
RUN apk -U --purge del alpine-sdk openssl-dev ruby-dev

COPY . /usr/app
EXPOSE 80

CMD ["foreman", "start"]
