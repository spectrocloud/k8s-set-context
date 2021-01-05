import axios, {AxiosInstance} from 'axios';
import {Writable} from 'stream';
import fs from 'fs';

// abstract class HttpClient {
//   protected readonly instance: AxiosInstance;

//   public constructor(baseURL: string) {
//     this.instance = axios.create({
//       baseURL,
//     });

//     this._initializeResponseInterceptor();
//   }

//   private _initializeResponseInterceptor = () => {
//     this.instance.interceptors.response.use(
//       this._handleResponse,
//       this._handleError,
//     );
//   };

//   private _handleResponse = ({ data }: AxiosResponse) => data;

//   protected _handleError = (error: any) => Promise.reject(error);
// }

export default class Client {
  // private authToken: string
  private client?: AxiosInstance

  constructor(
    readonly host: string,
    readonly username: string,
    readonly password: string
  ) {}

  private async getProjects() {
    return ["hello"];
  }

  private async getAuthToken() {
    const url = `https://${this.host}/v1alpha1/auth/authenticate`;
    return axios.post(url, {
      emailId: this.username,
      password: this.password,
      timeout: 2000,
    }).then(response => response.data);
  }

  private async getClient() {
    // TODO expired
    if (this.client) {
      return this.client;
    }

    console.log("Logging in");
    const authToken = await this.getAuthToken();

    this.client = axios.create({
      baseURL: `https://${this.host}`,
      timeout: 2000,
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

  async getClusterUID(projectUID: string, clusterName: string) {
    const c = await this.getClient();
    return c.get(`/v1alpha1/spectroclusters?filters=metadata.name=${clusterName}&ProjectUid=${projectUID}`)
      .then( response => response.data )
      .then(data => {
        if (!data || !data.items) {
          throw new Error(`No cluster found with name '${clusterName}'`);
        }

        return data.items[0].metadata.uid;
      });
  }

  async getClusterKubeconfig(projectUID: string, clusterUID: string) {
    const c = await this.getClient();
    console.log(projectUID, clusterUID);

    return c.get(`/v1alpha1/spectroclusters/${clusterUID}/assets/kubeconfig?ProjectUid=${projectUID}`, {responseType: 'text', headers: {'Accept' : '*/*'}})
      .then( response => {
        return response.data
      });
  }

}
