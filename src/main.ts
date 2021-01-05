import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'

import Client from './client'

interface Credentials {
  host: string;
  username: string;
  password: string;
}

// TODO handle wrong credentials
export async function getKubeconfigFromSpectroCloud(cred: Credentials, projectName: string, clusterName: string) {
  const c = new Client(cred.host, cred.username, cred.password);
  const projectUid = await c.getProjectUID(projectName);
  const clusterUid = await c.getClusterUID(projectUid, clusterName);
  const kubeconfig = await c.getClusterKubeconfig(projectUid, clusterUid);
  return kubeconfig;
}

async function getKubeconfig() {
  const credentials = {
    host: core.getInput('host', {required : true}),
    username: core.getInput('username', {required : true}),
    password: core.getInput('password', {required : true}),
  }
  const projectName =  core.getInput('projectName', {required : true});
  const clusterName =  core.getInput('clusterName', {required : true});

  return getKubeconfigFromSpectroCloud(credentials, projectName, clusterName);
}

export async function run() {
  let kubeconfig = await getKubeconfig();
  const runnerTempDirectory = (process.env['RUNNER_TEMP'] as string); // Using process.env until the core libs are updated
  const kubeconfigPath = path.join(runnerTempDirectory, `kubeconfig_${Date.now()}`);
  core.debug(`Writing kubeconfig contents to ${kubeconfigPath}`);
  fs.writeFileSync(kubeconfigPath, kubeconfig);
  fs.chmodSync(kubeconfigPath, '600');
  core.exportVariable('KUBECONFIG', kubeconfigPath);
  console.log('KUBECONFIG environment variable is set');
}

run().catch(core.setFailed);
