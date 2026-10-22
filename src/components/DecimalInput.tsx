import React, { useEffect, useState } from 'react';
import { StyleProp, TextInput, TextStyle } from 'react-native';
import { parseDecimal } from '../lib/numbers';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
  placeholder?: string;
  placeholderTextColor?: string;
  style?: StyleProp<TextStyle>;
  invalidStyle?: StyleProp<TextStyle>;
}

// A number field that lets you type "72." and "72,5" without the text
// snapping back, and only reports values inside [min, max].
export function DecimalInput({ value, onChange, min, max, placeholder, placeholderTextColor, style, invalidStyle }: Props) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);

  // Follow outside changes (e.g. cloud sync) while the user isn't typing.
  useEffect(() => {
    if (!focused) setText(value == null ? '' : String(value));
  }, [value, focused]);

  function handleChange(next: string) {
    setText(next);
    const parsed = parseDecimal(next);
    if (next.trim() === '') {
      setInvalid(false);
      onChange(null);
    } else if (parsed !== null && parsed >= min && parsed <= max) {
      setInvalid(false);
      onChange(parsed);
    } else {
      setInvalid(true);
    }
  }

  return (
    <TextInput
      style={[style, invalid && invalidStyle]}
      value={text}
      onChangeText={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setInvalid(false);
        setText(value == null ? '' : String(value));
      }}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
    />
  );
}
