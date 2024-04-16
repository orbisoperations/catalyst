import RegistrarWorker from "@catalyst/data_channel_registrar/src/worker"
interface Env  {
  DATA_CHANNEL_REGISTRAR: Service<RegistrarWorker>
  AUTHX_TOKEN_API: Fetcher
}