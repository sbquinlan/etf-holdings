FROM amd64/ubuntu:latest as install
WORKDIR /root

RUN apt-get update -y
RUN apt-get install --no-install-recommends --yes \
  curl \
  ca-certificates \
  unzip \
  openjdk-11-jre

RUN curl -sSL https://download2.interactivebrokers.com/portal/clientportal.gw.zip --output portal.zip
RUN unzip portal.zip
RUN rm portal.zip

# copy conf yaml if it exists to "gateway"
COPY ./*.yaml /root/root/
EXPOSE 5000

CMD /root/bin/run.sh /root/root/conf.yaml