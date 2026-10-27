import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { MascotTip } from '@/components/Mascot';
import { Body, Button, Card, ErrorNotice, Loading, Screen, Tag } from '@/components/ui';
import { useDb } from '@/db/DatabaseProvider';
import { toLocalDay } from '@/core/dates';
import { getDailyChallenge, getDailyStreak, getGamesSummary } from '@/db/games';
import { useAsyncData } from '@/hooks/useAsyncData';
import { DAILY_MAX_SCORE, formatDuration } from '@/games/daily';
import { REST_AFTER_PLAYS } from '@/games/rewards';
import { GAMES, roundsFor } from '@/games/types';
import { useTheme } from '@/theme/ThemeProvider';

export default function Juegos() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { data, error, reload } = useAsyncData(async () => {
    const now = new Date();
    const [summary, daily, dailyStreak] = await Promise.all([
      getGamesSummary(db, now),
      getDailyChallenge(db, toLocalDay(now)),
      getDailyStreak(db, now),
    ]);
    return { ...summary, daily, dailyStreak };
  });

  if (error) {
    return (
      <Screen>
        <ErrorNotice error={error} onRetry={reload} />
      </Screen>
    );
  }
  if (!data) return <Loading />;

  const tired = data.playsToday >= REST_AFTER_PLAYS;

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        Juegos
      </Text>
      <MascotTip
        mood={tired ? 'animo' : 'feliz'}
        text={
          tired
            ? `Ya llevas ${data.playsToday} partidas hoy. ¡Buen trabajo! Descansa un rato y vuelve más tarde.`
            : 'Partidas cortas para entrenar tu mente jugando. Cada juego practica una habilidad de la olimpiada.'
        }
      />
      <Card accent={colors.warning}>
        <View style={styles.head}>
          <Ionicons name="calendar" size={30} color={colors.warning} />
          <View style={styles.flex}>
            <Text style={[styles.name, { color: colors.text }]}>Reto del día</Text>
            <Body muted>
              El mismo reto para todos hoy: los 4 juegos y una pregunta final como las del examen. Compara tu resultado con tus amigos.
            </Body>
          </View>
        </View>
        <View style={styles.tags}>
          {data.daily ? (
            <Tag label={`Hoy: ${data.daily.score}/${data.daily.maxScore} · ${formatDuration(data.daily.timeMs)}`} tone="success" icon="checkmark-circle" />
          ) : (
            <Tag label={`Sin hacer hoy · ${DAILY_MAX_SCORE} rondas`} tone="neutral" />
          )}
          {data.dailyStreak > 0 ? <Tag label={`${data.dailyStreak} ${data.dailyStreak === 1 ? 'día seguido' : 'días seguidos'}`} tone="warning" icon="flame" /> : null}
        </View>
        <Button label={data.daily ? 'Jugarlo otra vez' : 'Jugar el reto del día'} icon="flash" onPress={() => router.push('/reto-dia')} />
      </Card>
      {GAMES.map((g) => {
        const s = data.stats[g.id];
        return (
          <Card key={g.id} accent={g.color}>
            <View style={styles.head}>
              <Ionicons name={g.icon} size={30} color={g.color} />
              <View style={styles.flex}>
                <Text style={[styles.name, { color: colors.text }]}>{g.title}</Text>
                <Body muted>{g.tagline}</Body>
              </View>
            </View>
            <View style={styles.tags}>
              <Tag label={g.trains} tone="neutral" />
              {s.plays > 0 ? <Tag label={`Nivel ${s.nextLevel}`} /> : null}
              {s.plays > 0 ? <Tag label={`Mejor: ${s.bestScore}/${roundsFor(g.id)}`} tone="success" /> : null}
              {s.bestTimeMs !== null ? <Tag label={`Récord: ${formatDuration(s.bestTimeMs)}`} tone="warning" icon="flash" /> : null}
            </View>
            <Button label={s.plays > 0 ? 'Jugar otra vez' : 'Jugar'} icon="play" onPress={() => router.push(`/jugar/${g.id}`)} />
          </Card>
        );
      })}
      <Body muted>Los juegos suman poco XP al día a propósito: lo que más te ayuda es practicar en la Academia y en los simulacros.</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '900' },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: '800' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
