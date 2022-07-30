FROM amd64/alpine:latest

RUN apk update
RUN apk add \
  curl \
  ca-certificates \
  unzip \
  openjdk11

WORKDIR /root
RUN curl -sSL https://download2.interactivebrokers.com/portal/clientportal.gw.zip --output portal.zip
RUN unzip portal.zip
RUN ls -al 
RUN rm portal.zip

# copy conf yaml if it exists to "gateway"
COPY ./*.yaml /root/
RUN sed -i -e 's/^java[^\\]*/\0 --add-opens java.base\/jdk.internal.misc=ALL-UNNAMED /' /root/bin/run.sh
EXPOSE 5000

CMD sh /root/bin/run.sh /root/conf.yaml