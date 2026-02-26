# Edited by Claude.
# Build stage - install dependencies including sharp
FROM public.ecr.aws/lambda/nodejs:22 AS build

WORKDIR ${LAMBDA_TASK_ROOT}
COPY handler.js package.json ./

# Install sharp with platform-specific binaries for Lambda ARM64
RUN npm install --cpu=arm64 --os=linux --omit=dev

# Production stage
FROM public.ecr.aws/lambda/nodejs:22

COPY --from=build ${LAMBDA_TASK_ROOT} ${LAMBDA_TASK_ROOT}

CMD ["handler.handle"]