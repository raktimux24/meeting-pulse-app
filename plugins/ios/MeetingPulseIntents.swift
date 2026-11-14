import AppIntents
import Foundation

// Siri, Shortcuts, Spotlight and the Action Button.
// These intents open the app and leave the screen to show in UserDefaults, then post a notification.
// The native module turns that into an "onRouteRequested" event; the app also checks for a waiting
// route when it starts, which covers cold starts before JavaScript is listening.
// Copied into the app target by plugins/with-meeting-pulse-intents.js (App Shortcuts must live there).

private func requestRoute(_ route: String) {
  let defaults = UserDefaults.standard
  defaults.set(route, forKey: "MeetingPulsePendingRoute")
  defaults.set(Date().timeIntervalSince1970, forKey: "MeetingPulsePendingRouteDate")
  // iOS brings the app forward before perform() runs, so also tell the running app right away.
  NotificationCenter.default.post(name: Notification.Name("MeetingPulseRouteRequested"), object: nil)
}

@available(iOS 16.4, *)
enum MeetingPulseMood: String, AppEnum {
  case energized, clear, aligned, neutral, confused, drained, frustrated, anxious

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Meeting mood"
  static var caseDisplayRepresentations: [MeetingPulseMood: DisplayRepresentation] = [
    .energized: "Energized",
    .clear: "Clear",
    .aligned: "Aligned",
    .neutral: "Neutral",
    .confused: "Confused",
    .drained: "Drained",
    .frustrated: "Frustrated",
    .anxious: "Anxious",
  ]
}

@available(iOS 16.4, *)
struct OpenQuickPulseIntent: AppIntent {
  static var title: LocalizedStringResource = "Log a Quick Pulse"
  static var description = IntentDescription("Open Meeting Pulse to capture how your last meeting landed.")
  static var openAppWhenRun: Bool = true

  func perform() async throws -> some IntentResult {
    requestRoute("/quick-pulse")
    return .result()
  }
}

@available(iOS 16.4, *)
struct LogMeetingMoodIntent: AppIntent {
  static var title: LocalizedStringResource = "Log How a Meeting Felt"
  static var description = IntentDescription("Open a Quick Pulse with the mood already chosen.")
  static var openAppWhenRun: Bool = true

  @Parameter(title: "Mood", requestValueDialog: "How did the meeting land?")
  var mood: MeetingPulseMood

  static var parameterSummary: some ParameterSummary {
    Summary("Log a \(\.$mood) meeting")
  }

  func perform() async throws -> some IntentResult {
    requestRoute("/quick-pulse?mood=\(mood.rawValue)")
    return .result()
  }
}

@available(iOS 16.4, *)
struct OpenWeeklySignalIntent: AppIntent {
  static var title: LocalizedStringResource = "Show My Weekly Meeting Signal"
  static var description = IntentDescription("Open this week's meeting insights.")
  static var openAppWhenRun: Bool = true

  func perform() async throws -> some IntentResult {
    requestRoute("/insights")
    return .result()
  }
}

@available(iOS 16.4, *)
struct MeetingPulseShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: OpenQuickPulseIntent(),
      phrases: [
        "Log a \(.applicationName)",
        "Log a meeting in \(.applicationName)",
        "Quick Pulse in \(.applicationName)",
        "Log my last meeting in \(.applicationName)",
      ],
      shortTitle: "Quick Pulse",
      systemImageName: "waveform.path.ecg"
    )
    AppShortcut(
      intent: LogMeetingMoodIntent(),
      phrases: [
        "Log a \(\.$mood) meeting in \(.applicationName)",
        "My meeting felt \(\.$mood) in \(.applicationName)",
      ],
      shortTitle: "Log a mood",
      systemImageName: "heart.text.square"
    )
    AppShortcut(
      intent: OpenWeeklySignalIntent(),
      phrases: [
        "Show my \(.applicationName) weekly signal",
        "How were my meetings this week in \(.applicationName)",
      ],
      shortTitle: "Weekly signal",
      systemImageName: "chart.bar"
    )
  }
}
