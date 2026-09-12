FROM node:24.13.0-bookworm-slim AS client-build
WORKDIR /src
COPY package.json package-lock.json .npmrc ./
COPY client/package.json client/package.json
RUN npm ci
COPY client/ client/
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0.401 AS server-build
WORKDIR /src
COPY global.json ./
COPY server/Lifemaxing.Api/Lifemaxing.Api.csproj server/Lifemaxing.Api/packages.lock.json server/Lifemaxing.Api/
RUN dotnet restore server/Lifemaxing.Api --locked-mode
COPY server/ server/
RUN dotnet publish server/Lifemaxing.Api -c Release --no-restore -o /app
COPY --from=client-build /src/client/dist/ /app/wwwroot/

FROM mcr.microsoft.com/dotnet/aspnet:10.0.12 AS final
WORKDIR /app
COPY --from=server-build /app/ ./
ENV ASPNETCORE_HTTP_PORTS=8080
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Lifemaxing.Api.dll"]
