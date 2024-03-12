ARG NODE_VERSION=20.10.0
ARG FUNCTION_DIR="/function"

FROM 671123374425.dkr.ecr.eu-central-1.amazonaws.com/common/sharp-base as sharp

FROM public.ecr.aws/lambda/nodejs:20 as build
# Include global arg in this stage of the build
ARG FUNCTION_DIR
RUN mkdir -p ${FUNCTION_DIR}

WORKDIR ${FUNCTION_DIR}
COPY handler.js package.json ${FUNCTION_DIR}

RUN npm install --cpu=arm64 --os=linux --omit=dev --omit=optional

FROM public.ecr.aws/lambda/nodejs:20
# Include global arg in this stage of the build
ARG FUNCTION_DIR
#RUN mkdir -p ${FUNCTION_DIR}
#WORKDIR ${FUNCTION_DIR}

COPY --from=sharp ${FUNCTION_DIR} ${LAMBDA_TASK_ROOT}
COPY --from=build ${FUNCTION_DIR} ${LAMBDA_TASK_ROOT}

# Pass the name of the function handler as an argument to the runtime
CMD ["handler.handle"]