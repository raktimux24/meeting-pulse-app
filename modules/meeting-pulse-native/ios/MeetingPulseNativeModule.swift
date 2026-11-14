import ExpoModulesCore
import HealthKit

/// Key shared with MeetingPulseIntents.swift (compiled into the app target by plugins/with-meeting-pulse-intents.js).
private let pendingRouteKey = "MeetingPulsePendingRoute"
private let pendingRouteDateKey = "MeetingPulsePendingRouteDate"
private let routeRequestedNotification = Notification.Name("MeetingPulseRouteRequested")

public class MeetingPulseNativeModule: Module {
  private lazy var healthStore = HKHealthStore()
  private var routeObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("MeetingPulseNative")

    Events("onRouteRequested")

    OnStartObserving {
      self.routeObserver = NotificationCenter.default.addObserver(forName: routeRequestedNotification, object: nil, queue: .main) { [weak self] _ in
        self?.sendEvent("onRouteRequested", [:])
      }
    }

    OnStopObserving {
      if let observer = self.routeObserver {
        NotificationCenter.default.removeObserver(observer)
        self.routeObserver = nil
      }
    }

    // MARK: Apple Health "State of Mind" (iOS 18+)

    Function("isHealthAvailable") { () -> Bool in
      if #available(iOS 18.0, *) {
        return HKHealthStore.isHealthDataAvailable()
      }
      return false
    }

    AsyncFunction("requestHealthAccess") { (promise: Promise) in
      guard #available(iOS 18.0, *), HKHealthStore.isHealthDataAvailable() else {
        promise.resolve(false)
        return
      }
      let type = HKObjectType.stateOfMindType()
      self.healthStore.requestAuthorization(toShare: [type], read: []) { _, error in
        if let error {
          promise.reject("ERR_HEALTH_AUTH", error.localizedDescription)
          return
        }
        promise.resolve(self.healthStore.authorizationStatus(for: type) == .sharingAuthorized)
      }
    }

    Function("healthSharingAuthorized") { () -> Bool in
      guard #available(iOS 18.0, *), HKHealthStore.isHealthDataAvailable() else { return false }
      return self.healthStore.authorizationStatus(for: HKObjectType.stateOfMindType()) == .sharingAuthorized
    }

    AsyncFunction("saveStateOfMind") { (valence: Double, label: String, timestampMs: Double, promise: Promise) in
      guard #available(iOS 18.0, *), HKHealthStore.isHealthDataAvailable() else {
        promise.resolve(false)
        return
      }
      let date = Date(timeIntervalSince1970: timestampMs / 1000)
      let labels = MeetingPulseNativeModule.label(named: label).map { [$0] } ?? []
      let sample = HKStateOfMind(
        date: date,
        kind: .momentaryEmotion,
        valence: max(-1, min(1, valence)),
        labels: labels,
        associations: [.work]
      )
      self.healthStore.save(sample) { success, error in
        if let error {
          promise.reject("ERR_HEALTH_SAVE", error.localizedDescription)
          return
        }
        promise.resolve(success)
      }
    }

    // MARK: Siri and Shortcuts

    /// Returns the screen a Siri or Shortcuts action asked for in the last two minutes, once.
    Function("consumePendingRoute") { () -> String? in
      let defaults = UserDefaults.standard
      guard let route = defaults.string(forKey: pendingRouteKey) else { return nil }
      let requestedAt = defaults.double(forKey: pendingRouteDateKey)
      defaults.removeObject(forKey: pendingRouteKey)
      defaults.removeObject(forKey: pendingRouteDateKey)
      return Date().timeIntervalSince1970 - requestedAt < 120 ? route : nil
    }
  }

  @available(iOS 18.0, *)
  private static func label(named name: String) -> HKStateOfMind.Label? {
    switch name {
    case "excited": return .excited
    case "confident": return .confident
    case "satisfied": return .satisfied
    case "indifferent": return .indifferent
    case "overwhelmed": return .overwhelmed
    case "drained": return .drained
    case "frustrated": return .frustrated
    case "anxious": return .anxious
    default: return nil
    }
  }
}
