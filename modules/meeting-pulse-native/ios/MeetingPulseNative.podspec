Pod::Spec.new do |s|
  s.name           = 'MeetingPulseNative'
  s.version        = '1.0.0'
  s.summary        = 'Apple Health State of Mind logging and Siri routing for Meeting Pulse.'
  s.description    = 'Writes meeting moods to Apple Health and hands Siri and Shortcuts routes to the app.'
  s.author         = 'Meeting Pulse'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.frameworks     = 'HealthKit'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
