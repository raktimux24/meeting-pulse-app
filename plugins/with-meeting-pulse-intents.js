/**
 * Adds plugins/ios/MeetingPulseIntents.swift (Siri and Shortcuts App Intents) to the main app target.
 * App Shortcuts are only discovered when they are compiled into the app itself, not into a pod.
 */
const fs = require('fs');
const path = require('path');
const { IOSConfig, withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const FILE_NAME = 'MeetingPulseIntents.swift';

function withIntentsSource(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectName = config.modRequest.projectName;
      const source = path.join(config.modRequest.projectRoot, 'plugins', 'ios', FILE_NAME);
      const destination = path.join(config.modRequest.platformProjectRoot, projectName, FILE_NAME);
      fs.copyFileSync(source, destination);
      return config;
    },
  ]);
}

function withIntentsInProject(config) {
  return withXcodeProject(config, (config) => {
    const projectName = config.modRequest.projectName;
    const filepath = `${projectName}/${FILE_NAME}`;
    if (!config.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project: config.modResults,
      });
    }
    return config;
  });
}

module.exports = function withMeetingPulseIntents(config) {
  return withIntentsInProject(withIntentsSource(config));
};
