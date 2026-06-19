import { Platform, View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  value: string;        // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  style?: any;
}

export default function DatePickerButton({ value, onChange, label, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {Platform.OS === 'web' ? (
        // On web: native HTML date picker (opens browser calendar popup)
        // @ts-ignore
        <input
          type="date"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            backgroundColor: '#FFF5F7',
            border: '1.5px solid #F0E0E5',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '15px',
            color: value ? '#2D2D2D' : '#BBBBBB',
            width: '100%',
            cursor: 'pointer',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          } as any}
        />
      ) : (
        // On native: styled text input (YYYY-MM-DD)
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#BBBBBB"
          keyboardType="numeric"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: 12 },
  label: { fontSize: 13, color: '#888', marginBottom: 6 },
  input: {
    backgroundColor: '#FFF5F7', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#2D2D2D',
    borderWidth: 1.5, borderColor: '#F0E0E5',
  },
});
