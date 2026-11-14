import { HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, containerBackground, font, foregroundStyle, frame, lineLimit, minimumScaleFactor, padding, shapes, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

/** Everything the widget shows. Written by src/data/widget-sync.ts whenever meetings change. */
export type PulseWidgetProps = {
  /** Today's summed impact score, already formatted with a sign ("+4.2"). */
  scoreText: string;
  tone: 'positive' | 'neutral' | 'negative' | 'empty';
  meetingCount: number;
  /** "Clear", "Drained"… for the latest meeting today, or "" when none. */
  lastMood: string;
  pendingPulses: number;
};

/**
 * Home screen and Lock Screen widget. Runs in the widget extension's own JavaScript runtime, so it
 * may only use @expo/ui/swift-ui and must declare every value inside the function.
 */
const PulseWidget = (props: PulseWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const paper = '#070A12';
  const ink = '#F7F8FC';
  const soft = '#B0BACE';
  const orange = '#FF7958';
  const toneColor = props.tone === 'positive' ? '#72E3BD' : props.tone === 'negative' ? '#FF6B81' : props.tone === 'neutral' ? '#FFD166' : soft;
  const hasMeetings = props.meetingCount > 0;
  const countText = hasMeetings ? `${props.meetingCount} ${props.meetingCount === 1 ? 'meeting' : 'meetings'} today` : 'No meetings logged today';
  const quickPulse = 'meetingpulse://quick-pulse';
  const family = environment.widgetFamily;

  if (family === 'accessoryInline') {
    return <Text modifiers={[widgetURL(quickPulse)]}>{hasMeetings ? `Pulse ${props.scoreText} · ${props.meetingCount} today` : 'Meeting Pulse · Log a meeting'}</Text>;
  }

  if (family === 'accessoryCircular') {
    return (
      <VStack spacing={0} modifiers={[widgetURL(quickPulse)]}>
        <Image systemName="waveform.path.ecg" size={12} />
        <Text modifiers={[font({ size: 17, weight: 'bold', design: 'rounded' }), minimumScaleFactor(0.6), lineLimit(1)]}>{hasMeetings ? props.scoreText : '—'}</Text>
      </VStack>
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[widgetURL(quickPulse)]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>Meeting Pulse</Text>
        <Text modifiers={[font({ size: 20, weight: 'bold', design: 'rounded' })]}>{hasMeetings ? props.scoreText : 'Log a meeting'}</Text>
        <Text modifiers={[font({ size: 12 }), lineLimit(1)]}>{hasMeetings ? countText : 'Tap for a Quick Pulse'}</Text>
      </VStack>
    );
  }

  const header = (
    <HStack spacing={5}>
      <Image systemName="waveform.path.ecg" size={12} color={orange} />
      <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(orange)]}>MEETING PULSE</Text>
    </HStack>
  );
  const score = (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 36, weight: 'bold', design: 'rounded' }), foregroundStyle(toneColor), minimumScaleFactor(0.6), lineLimit(1)]}>{hasMeetings ? props.scoreText : '—'}</Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(soft), lineLimit(2)]}>{countText}</Text>
      {props.lastMood ? <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(ink), lineLimit(1)]}>{`Last: ${props.lastMood}`}</Text> : null}
    </VStack>
  );
  const backdrop = containerBackground({ type: 'linearGradient', colors: ['#101A2C', paper], startPoint: { x: 1, y: 0 }, endPoint: { x: 0, y: 1 } }, 'widget');

  if (family === 'systemMedium') {
    const moods = [
      { id: 'energized', label: 'Energized', color: '#72E3BD' },
      { id: 'clear', label: 'Clear', color: '#72E3BD' },
      { id: 'neutral', label: 'Neutral', color: '#FFD166' },
      { id: 'drained', label: 'Drained', color: '#FF6B81' },
    ];
    return (
      <HStack spacing={12} modifiers={[backdrop]}>
        <VStack alignment="leading" spacing={6}>
          {header}
          {score}
          <Spacer />
          {props.pendingPulses > 0 ? <Text modifiers={[font({ size: 11 }), foregroundStyle(soft)]}>{`${props.pendingPulses} to finish`}</Text> : null}
        </VStack>
        <Spacer />
        <VStack alignment="leading" spacing={6}>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(soft)]}>How did it land?</Text>
          {moods.map((mood) => (
            <Link key={mood.id} destination={`meetingpulse://quick-pulse?mood=${mood.id}`}>
              <HStack spacing={6} modifiers={[padding({ horizontal: 10, vertical: 5 }), frame({ width: 124, alignment: 'leading' }), background('#1A2438', shapes.capsule())]}>
                <Text modifiers={[font({ size: 8 }), foregroundStyle(mood.color)]}>●</Text>
                <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(ink)]}>{mood.label}</Text>
              </HStack>
            </Link>
          ))}
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={6} modifiers={[backdrop, widgetURL(quickPulse)]}>
      {header}
      <Spacer />
      {score}
      <Spacer />
      <HStack spacing={4}>
        <Image systemName="plus.circle.fill" size={13} color={orange} />
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(orange)]}>Quick Pulse</Text>
      </HStack>
    </VStack>
  );
};

export default createWidget<PulseWidgetProps>('PulseWidget', PulseWidget);
