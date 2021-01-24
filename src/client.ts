import axios, {AxiosInstance} from 'axios';
import {Writable} from 'stream';
import fs from 'fs';
import HttpsProxyAgent from 'https-proxy-agent'

export default class Client {
  // private authToken: string
  private client?: AxiosInstance

  constructor(
    readonly host: string,
    readonly username: string,
    readonly password: string
  ) {}

  private async getAuthToken(httpsProxyAgent: any) {
    const url = `https://${this.host}/v1alpha1/auth/authenticate`;
    return axios.post(url, {
      emailId: this.username,
      password: this.password,
    }, {timeout: 5000, httpsAgent: httpsProxyAgent, proxy: false})
      .then(response => response.data)
      .catch(e => {
        console.log('error: ', e?.response?.data);
        // console.log('error: ', JSON.stringify(e, null, 2));
        throw e;
      });
  }

  private async getClient() {
    // TODO expired
    if (this.client) {
      return this.client;
    }

    let proxyAgent;
    const httpsProxy = process.env.HTTPS_PROXY
    console.log("Logging in", "proxy: ", httpsProxy);
    if (httpsProxy) {
      // https://github.com/axios/axios/issues/3459
      proxyAgent = new (HttpsProxyAgent as any)(httpsProxy);
    }

    const authToken = await this.getAuthToken(proxyAgent);

    this.client = axios.create({
      baseURL: `https://${this.host}`,
      timeout: 10000,
      httpsAgent: proxyAgent,
      proxy: false,
      headers: {
        'Authorization' : authToken['Authorization'],
      }
    });

    return this.client;

  }
  async getProjectUID(projectName: string) {
    const c = await this.getClient();
    return c.get(`/v1alpha1/projects?filters=metadata.name=${projectName}`)
      .then( response => response.data )
      .then(data => {
        if (!data || !data.items) {
          throw new Error(`No project found with name '${projectName}'`);
        }

        return data.items[0].metadata.uid;
      });
  }

  async getClusterUID(projectUID: string, clusterName: string, clusterTags: Map<string,string>) {
    const c = await this.getClient();

    const filters = ["metadata.isDeleted=false"];
    if (clusterName) {
      filters.push(`metadata.name=${clusterName}`)
    }
    if (clusterTags) {
      clusterTags.forEach( (v,k) => filters.push(`metadata.labels.${k}=${v}`) );
    }

    return c.get(`/v1alpha1/spectroclusters?filters=${filters.join('AND')}&ProjectUid=${projectUID}`)
      .then( response => response.data )
      .then(data => {
        if (!data || !data.items) {
          throw new Error(`No cluster found with name '${clusterName}'`);
        }

        const cluster = data.items[0];
        console.log(`Cluster: ${cluster.metadata.name} (${cluster.metadata.uid})`);

        return cluster.metadata.uid;
      });
  }

  async getClusterKubeconfig(projectUID: string, clusterUID: string) {
    const c = await this.getClient();

    return c.get(`/v1alpha1/spectroclusters/${clusterUID}/assets/kubeconfig?ProjectUid=${projectUID}`, {responseType: 'text', headers: {'Accept' : '*/*'}})
      .then( response => {
        return response.data
      });
  }

}
