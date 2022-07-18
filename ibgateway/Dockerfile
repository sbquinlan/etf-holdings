FROM amd64/ubuntu:latest as install
WORKDIR /tmp/install

RUN apt-get update -y
RUN apt-get install --no-install-recommends --yes \
  curl \
  ca-certificates \
  openjdk-11-jre \ 
  ant

# install IB Gateway
RUN curl -sSL https://download2.interactivebrokers.com/installers/ibgateway/latest-standalone/ibgateway-latest-standalone-linux-x64.sh --output install-ibgateway.sh
RUN chmod a+x install-ibgateway.sh
RUN ./install-ibgateway.sh -q -dir /root/Jts
COPY ./ibgateway/jts.ini /root/Jts/jts.ini

# install IBC
COPY ./IBC/ .
# the IBC build needs a path containing the TWS jars
ENV IBC_BIN /root/Jts/jars
RUN ant

### App Stage ###
FROM amd64/ubuntu:latest as app
WORKDIR /root
COPY --from=install /root/Jts /root/Jts/ibgateway
# need to copy over the jre from the jts install
COPY --from=install /usr/local/i4j_jres /usr/local/i4j_jres
COPY --from=install /tmp/install/target/IBCLinux ./ibc
COPY ./ibgateway/ibc_config.ini ibc/config.ini
COPY ./ibgateway/run.sh /root/run.sh

RUN chmod -R u+x /root/run.sh
RUN chmod -R u+x /root/ibc/*.sh 
RUN chmod -R u+x /root/ibc/scripts/*.sh

RUN apt-get update -y
RUN apt-get install --no-install-recommends -y \
  xvfb \
  libxslt-dev \
  libxrender1 \
  libxtst6 \
  libxi6 \
  libgtk2.0-bin \
# other dockerfiles fork out the ports to 4000, i dont
#  socat \
  x11vnc

ENV TWS_PATH /root/Jts
ENV IBC_PATH /root/ibc
ENV IBC_INI /root/ibc/config.ini
ENV TWOFA_TIMEOUT_ACTION exit

ENV VNC_PORT 5900
EXPOSE $VNC_PORT

CMD /root/run.sh