import React, { useState } from 'react'
import { View, Text, SafeAreaView, TextInput, ScrollView, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useIdentity } from '@awarizon/react'
import { usePin } from '../../../hooks/usePin'
import { PinInput } from '../../../components/ui/PinInput'
import { Button } from '../../../components/ui/Button'
import { isValidRizName } from '../../../utils/validation'
import { Colors } from '../../../constants/colors'

export default function RegisterIdentityScreen() {
  const router = useRouter()
  const { identity, register, update, actionLoading, isAvailable } = useIdentity()
  const { verifyPin } = usePin()
  const C = Colors.dark

  const isEdit = !!identity

  const [rizName, setRizName] = useState(identity?.rizName ?? '')
  const [displayName, setDisplayName] = useState(identity?.displayName ?? '')
  const [bio, setBio] = useState(identity?.bio ?? '')
  const [website, setWebsite] = useState(identity?.website ?? '')
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [checkingName, setCheckingName] = useState(false)
  const [step, setStep] = useState<'form' | 'pin'>('form')
  const [pinError, setPinError] = useState<string | null>(null)

  const checkAvailability = async (name: string) => {
    if (!isValidRizName(name)) { setNameAvailable(null); return }
    setCheckingName(true)
    const avail = await isAvailable(name)
    setNameAvailable(avail)
    setCheckingName(false)
  }

  const canSubmit = isEdit
    ? displayName.length > 0
    : isValidRizName(rizName) && nameAvailable === true

  const handleSubmit = () => {
    if (!canSubmit) return
    setStep('pin')
  }

  const handlePin = async (pin: string) => {
    try {
      const correct = await verifyPin(pin)
      if (!correct) { setPinError('Incorrect PIN'); return }

      if (isEdit) {
        await update({ displayName, bio, website })
        Alert.alert('Updated!', 'Identity updated successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ])
      } else {
        await register({ rizName, displayName, bio, website })
        Alert.alert('Registered!', `Your .riz name @${rizName} is live.`, [
          { text: 'OK', onPress: () => router.back() },
        ])
      }
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Failed')
    }
  }

  if (step === 'pin') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
        <View style={styles.pinContainer}>
          <PinInput length={6} onComplete={handlePin} error={pinError} label="Confirm with PIN" />
          <Button label="Cancel" variant="ghost" onPress={() => setStep('form')} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Button label="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text style={[styles.title, { color: C.text }]}>
            {isEdit ? 'Edit Identity' : 'Register Identity'}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.form}>
          {!isEdit && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textMuted }]}>
                .RIZ Name {checkingName && '(checking...)'}
                {nameAvailable === true && ' ✓ Available'}
                {nameAvailable === false && ' ✗ Taken'}
              </Text>
              <TextInput
                value={rizName}
                onChangeText={name => {
                  setRizName(name.toLowerCase())
                  setNameAvailable(null)
                }}
                onBlur={() => checkAvailability(rizName)}
                placeholder="yourname"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
              />
              <Text style={[styles.hint, { color: C.textMuted }]}>
                3–32 characters, lowercase letters, numbers, underscores
              </Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textMuted }]}>Display Name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your Name"
              placeholderTextColor={C.textMuted}
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textMuted }]}>Bio (optional)</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell the network about yourself..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              style={[styles.inputMulti, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textMuted }]}>Website (optional)</Text>
            <TextInput
              value={website}
              onChangeText={setWebsite}
              placeholder="https://..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: C.border }]}>
        <Button
          label={isEdit ? 'Save Changes' : 'Register'}
          variant="primary"
          size="lg"
          style={styles.btnFull}
          disabled={!canSubmit}
          loading={actionLoading}
          onPress={handleSubmit}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '700' },
  form: { gap: 20 },
  field: { gap: 6 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  input: { borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 15 },
  inputMulti: { borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 14, height: 96, textAlignVertical: 'top' },
  hint: { fontSize: 11 },
  footer: { padding: 24, paddingBottom: 32, borderTopWidth: 1 },
  btnFull: { width: '100%' },
  pinContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 },
})
