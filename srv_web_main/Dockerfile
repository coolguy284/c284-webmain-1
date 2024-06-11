FROM ubuntu:22.04
STOPSIGNAL SIGINT

RUN adduser webmain -u 2201
WORKDIR /home/webmain

RUN apt-get update && apt-get upgrade -y

RUN apt-get install curl git -y

# install node.js
ARG NODE_MAJOR_VER
ARG NODE_FULL_VER
RUN curl -fsSL https://deb.nodesource.com/nsolid_setup_deb.sh | bash -s $NODE_MAJOR_VER
RUN apt-get install nodejs fontconfig fonts-liberation pkg-config build-essential libpixman-1-dev libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev make -y
RUN npm install -g npm

USER webmain

RUN mkdir cert

# manual instead of add because the file will never change so might as well reduce server load
#ADD --chown=webmain:webmain https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt websites/public/data/
RUN mkdir -p websites/public/data && curl -fsSL https://www.unicode.org/Public/UCD/latest/ucd/UnicodeData.txt > websites/public/data/UnicodeData.txt

# clone english words list
WORKDIR /home/webmain/websites/public/data
RUN git clone https://github.com/dwyl/english-words.git && mv english-words/words.txt ./ && rm -rf english-words
WORKDIR /home/webmain

COPY --chown=webmain:webmain srv_web_main/common/recursive_readdir.js common/recursive_readdir.js
COPY --chown=webmain:webmain srv_web_main/common/website_data_parse.js common/website_data_parse.js
COPY --chown=webmain:webmain srv_web_main/websites/website_data.txt websites/website_data.txt
COPY --chown=webmain:webmain srv_web_main/helpers/compress_and_etags.js helpers/compress_and_etags.js

RUN node helpers/compress_and_etags.js --only '^data/[a-zA-Z]+\.txt(?:\.br|\.gz)?$'

COPY --chown=webmain:webmain srv_web_main/log_utils.js log_utils.js

COPY --chown=webmain:webmain srv_web_main/package-basic.json package.json
RUN npm install

RUN mkdir -p websites/public/libs/extern && \
  cp node_modules/bson/lib/bson.bundle.js websites/public/libs/extern/bson.bundle.js && \
  cp node_modules/bson/lib/bson.bundle.js.map websites/public/libs/extern/bson.bundle.js.map && \
  cp node_modules/mathjs/lib/browser/math.js websites/public/libs/extern/math.js && \
  cp node_modules/mathjs/lib/browser/math.js.map websites/public/libs/extern/math.js.map

COPY --chown=webmain:webmain srv_web_main/websites/public/libs websites/public/libs
RUN node helpers/compress_and_etags.js --only '^libs/.*$'

COPY --chown=webmain:webmain srv_web_main/dockerenv.list dockerenv.list

# Clones each repo in the apps folder
# uses this CLEVER solution to invalidate cache when repo is updated (the comment):
# https://stackoverflow.com/questions/27529191/how-to-update-code-from-git-to-a-docker-container/41361409#41361409

RUN mkdir -p websites/public/apps
WORKDIR /home/webmain/websites/public/apps

ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/mandel-viewer-v2/commits?per_page=1' mandel-viewer-v2_latest_commit
RUN rm mandel-viewer-v2_latest_commit
RUN git clone https://github.com/coolguy284/mandel-viewer-v2.git

ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/special-relativity-sim/commits?per_page=1' special-relativity-sim_latest_commit
RUN rm special-relativity-sim_latest_commit
RUN git clone https://github.com/coolguy284/special-relativity-sim.git

ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/3d-gravity/commits?per_page=1' 3d-gravity_latest_commit
RUN rm 3d-gravity_latest_commit
RUN git clone https://github.com/coolguy284/3d-gravity.git

ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/html5-fancy-clock/commits?per_page=1' html5-fancy-clock_latest_commit
RUN rm html5-fancy-clock_latest_commit
RUN git clone https://github.com/coolguy284/html5-fancy-clock.git

ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/html5-temporal-conways-life/commits?per_page=1' html5-temporal-conways-life_latest_commit
RUN rm html5-temporal-conways-life_latest_commit
RUN git clone https://github.com/coolguy284/html5-temporal-conways-life.git

ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/3d-raymarcher/commits?per_page=1' 3d-raymarcher_latest_commit
RUN rm 3d-raymarcher_latest_commit
RUN git clone https://github.com/coolguy284/3d-raymarcher.git

ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/inf-voxel-test/commits?per_page=1' inf-voxel-test_latest_commit
RUN rm inf-voxel-test_latest_commit
RUN git clone https://github.com/coolguy284/inf-voxel-test.git

ADD --chown=webmain:webmain 'https://api.github.com/repos/coolguy284/html5-time-tracker/commits?per_page=1' html5-time-tracker_latest_commit
RUN rm html5-time-tracker_latest_commit
RUN git clone https://github.com/coolguy284/html5-time-tracker.git

# Change workdir back for rest of dockerfile
WORKDIR /home/webmain

RUN node helpers/compress_and_etags.js --only '^apps/inf-voxel-test/lib_extern/.*$'

COPY --chown=webmain:webmain srv_web_main/package.json package.json

COPY --chown=webmain:webmain srv_web_main/helpers helpers
COPY --chown=webmain:webmain srv_web_main/index.js index.js
COPY --chown=webmain:webmain srv_web_main/common common
COPY --chown=webmain:webmain srv_web_main/requests requests
COPY --chown=webmain:webmain srv_web_main/websites websites

COPY --chown=webmain:webmain srv_web_main/websites/redirects.txt srv_web_main/websites/website_data.txt websites/public/debug/config/

COPY --chown=webmain:webmain .git .git

RUN ln -s . srv_web_main && node helpers/main.js && rm srv_web_main

ENTRYPOINT ["node", "--trace-warnings", "--pending-deprecation", "--trace-deprecation", "index.js"]
