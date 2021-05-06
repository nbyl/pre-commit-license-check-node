#!/usr/bin/env ts-node-script

"use strict";

import { exec } from "child_process";
import { existsSync } from "fs";
import neatCsv from "neat-csv";
import path from "path";
import { config } from "process";

interface Configuration {
  allowedLicenses: string[];
}

const CONFIG_FILE_NAME = ".license-check-node.json";

function loadConfiguration(directory: string): Promise<Configuration> {
  let configFileName = path.join(directory, CONFIG_FILE_NAME);

  if (!existsSync(configFileName)) {
    return new Promise((resolve) => {
      resolve({
        allowedLicenses: [],
      });
    });
  }

  // TODO: load from json
}

function extractUsedLicenses(directory: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let command =
      path.dirname(process.argv[1]) +
      "/node_modules/.bin/license-checker --csv";

    //console.log(command);

    exec(command, { cwd: directory }, (error, stdout) => {
      if (error) {
        reject(error);
      }

      resolve(stdout);
    });
  });
}

async function parseLicenseScannerOutput(output: string): Promise<string[]> {
  let packages = await neatCsv(output);
  let licenses = await packages.map((npmPackage) => {
    return npmPackage["license"];
  });

  return [...new Set(licenses)];
}

async function extractForbiddenLicenses(
  configuration: Configuration,
  usedLicenses: string[]
): Promise<string[]> {
  return usedLicenses.filter((license) => {
    return configuration.allowedLicenses.indexOf(license) < 0;
  });
}

async function checkLicenses(packageFile: string): Promise<boolean> {
  let directory = path.dirname(packageFile);
  console.log("Scanning licenses for " + directory);

  let configuration = await loadConfiguration(directory);
  let licenseOutput = await extractUsedLicenses(directory);
  let usedLicenses = await parseLicenseScannerOutput(licenseOutput);
  let forbiddenLicenses = await extractForbiddenLicenses(
    configuration,
    usedLicenses
  );

  if (forbiddenLicenses.length > 0) {
    showErrorMessage(directory, forbiddenLicenses);
    return false;
  }

  return true;
}

export function showErrorMessage(directory: string, forbiddenLicenses: string[]) {
  let demoConfiguration: Configuration = { allowedLicenses: forbiddenLicenses };

  console.log("**************************************************************");
  console.log(
    "Not all licenses used in directory " + directory + " are allowed."
  );
  console.log();
  console.log(
    "If you want to allow these licenses, please put the following lines into"
  );
  console.log(
    "the allow list file: " + path.join(directory, CONFIG_FILE_NAME) + ": "
  );
  console.log();
  console.log(JSON.stringify(demoConfiguration, null, 2));
  console.log();
  console.log("**************************************************************");
}

function main() {
  Promise.all(process.argv.slice(2).map(checkLicenses)).then((result) => {
    let allOk = result.every((v) => v === true);
    if (!allOk) {
      process.exit(1);
    }
  });
}

main();
