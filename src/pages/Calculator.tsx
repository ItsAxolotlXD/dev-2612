import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Binary,
  Calculator as CalcIcon,
  ChevronDown,
  Clock,
  Cpu,
  Delete,
  FlaskConical,
  HardDrive,
  History,
  Menu,
  Ruler,
  Scale,
  Thermometer,
  Trash2,
  X,
} from 'lucide-react';

type CalculatorMode =
  | 'standard'
  | 'scientific'
  | 'programmer'
  | 'length'
  | 'weight'
  | 'temperature'
  | 'data'
  | 'time';

type BinaryOperator = '+' | '−' | '×' | '÷' | 'mod' | 'x^y' | 'y√x';
type ProgrammerOp = 'AND' | 'OR' | 'XOR' | '<<' | '>>' | '+' | '−' | '×' | '÷' | '%';
type Radix = 16 | 10 | 8 | 2;
type WordSize = 'QWORD' | 'DWORD' | 'WORD' | 'BYTE';
type AngleUnit = 'DEG' | 'RAD';

interface HistoryEntry {
  id: string;
  expression: string;
  result: string;
  rawValue: number;
}

interface MemoryItem {
  id: string;
  value: number;
}

interface ConverterUnit {
  id: string;
  label: string;
  short: string;
  factor?: number;
}

const MODE_DEFINITIONS: Array<{
  section: string;
  items: Array<{ id: CalculatorMode; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    section: 'Calculator',
    items: [
      { id: 'standard', label: 'Standard', icon: CalcIcon },
      { id: 'scientific', label: 'Scientific', icon: FlaskConical },
      { id: 'programmer', label: 'Programmer', icon: Binary },
    ],
  },
  {
    section: 'Converter',
    items: [
      { id: 'length', label: 'Length', icon: Ruler },
      { id: 'weight', label: 'Weight and mass', icon: Scale },
      { id: 'temperature', label: 'Temperature', icon: Thermometer },
      { id: 'data', label: 'Data', icon: HardDrive },
      { id: 'time', label: 'Time', icon: Clock },
    ],
  },
];

const CONVERTER_UNITS: Record<'length' | 'weight' | 'temperature' | 'data' | 'time', ConverterUnit[]> = {
  length: [
    { id: 'mm', label: 'Millimeters', short: 'mm', factor: 0.001 },
    { id: 'cm', label: 'Centimeters', short: 'cm', factor: 0.01 },
    { id: 'm', label: 'Meters', short: 'm', factor: 1 },
    { id: 'km', label: 'Kilometers', short: 'km', factor: 1000 },
    { id: 'in', label: 'Inches', short: 'in', factor: 0.0254 },
    { id: 'ft', label: 'Feet', short: 'ft', factor: 0.3048 },
    { id: 'yd', label: 'Yards', short: 'yd', factor: 0.9144 },
    { id: 'mi', label: 'Miles', short: 'mi', factor: 1609.344 },
  ],
  weight: [
    { id: 'mg', label: 'Milligrams', short: 'mg', factor: 0.000001 },
    { id: 'g', label: 'Grams', short: 'g', factor: 0.001 },
    { id: 'kg', label: 'Kilograms', short: 'kg', factor: 1 },
    { id: 't', label: 'Metric tonnes', short: 't', factor: 1000 },
    { id: 'oz', label: 'Ounces', short: 'oz', factor: 0.028349523125 },
    { id: 'lb', label: 'Pounds', short: 'lb', factor: 0.45359237 },
  ],
  temperature: [
    { id: 'c', label: 'Celsius', short: '°C' },
    { id: 'f', label: 'Fahrenheit', short: '°F' },
    { id: 'k', label: 'Kelvin', short: 'K' },
  ],
  data: [
    { id: 'b', label: 'Bytes', short: 'B', factor: 1 },
    { id: 'kb', label: 'Kilobytes', short: 'KB', factor: 1024 },
    { id: 'mb', label: 'Megabytes', short: 'MB', factor: 1048576 },
    { id: 'gb', label: 'Gigabytes', short: 'GB', factor: 1073741824 },
    { id: 'tb', label: 'Terabytes', short: 'TB', factor: 1099511627776 },
  ],
  time: [
    { id: 'ms', label: 'Milliseconds', short: 'ms', factor: 0.001 },
    { id: 's', label: 'Seconds', short: 's', factor: 1 },
    { id: 'min', label: 'Minutes', short: 'min', factor: 60 },
    { id: 'h', label: 'Hours', short: 'h', factor: 3600 },
    { id: 'd', label: 'Days', short: 'd', factor: 86400 },
    { id: 'wk', label: 'Weeks', short: 'wk', factor: 604800 },
  ],
};

const WORD_BITS: Record<WordSize, number> = {
  QWORD: 64,
  DWORD: 32,
  WORD: 16,
  BYTE: 8,
};

const sanitizeFloat = (value: number): number => {
  if (!Number.isFinite(value)) return value;
  if (Math.abs(value) < 1e-14) return 0;
  return Number(value.toPrecision(14));
};

const formatDisplayNumber = (rawInput: string, scientificMode = false): string => {
  if (!rawInput) return '0';
  if (rawInput === 'Cannot divide by zero' || rawInput === 'Invalid input' || rawInput === 'Overflow') {
    return rawInput;
  }
  const num = Number(rawInput);
  if (scientificMode && Number.isFinite(num)) {
    return num.toExponential(6).replace('e+', 'e+');
  }
  if (rawInput.includes('e') || rawInput.includes('E')) {
    return rawInput;
  }
  const isNegative = rawInput.startsWith('-');
  const unsigned = isNegative ? rawInput.slice(1) : rawInput;
  const [intPart, decPart] = unsigned.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const prefix = isNegative ? '-' : '';
  return decPart !== undefined ? `${prefix}${formattedInt}.${decPart}` : `${prefix}${formattedInt}`;
};

const formatResultString = (value: number): string => {
  if (!Number.isFinite(value)) return 'Overflow';
  const cleaned = sanitizeFloat(value);
  if (Math.abs(cleaned) >= 1e16 || (cleaned !== 0 && Math.abs(cleaned) < 1e-12)) {
    return cleaned.toExponential(10).replace(/\.?0+e/, 'e');
  }
  return String(cleaned);
};

const factorial = (n: number): number => {
  if (!Number.isInteger(n) || n < 0) return Number.NaN;
  if (n > 170) return Number.POSITIVE_INFINITY;
  let result = 1;
  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }
  return result;
};

const maskWord = (value: bigint, wordSize: WordSize): bigint => {
  const bits = BigInt(WORD_BITS[wordSize]);
  const mask = (1n << bits) - 1n;
  return value & mask;
};

const toSignedBigInt = (value: bigint, wordSize: WordSize): bigint => {
  const bits = BigInt(WORD_BITS[wordSize]);
  const masked = maskWord(value, wordSize);
  const signBit = 1n << (bits - 1n);
  return masked >= signBit ? masked - (1n << bits) : masked;
};

const formatGroupedBinary = (raw: string): string => {
  const paddedLength = Math.ceil(raw.length / 4) * 4;
  const padded = raw.padStart(Math.max(4, paddedLength), '0');
  return padded.replace(/(.{4})(?=.)/g, '$1 ');
};

const convertUnitValue = (
  category: 'length' | 'weight' | 'temperature' | 'data' | 'time',
  value: number,
  fromId: string,
  toId: string
): number => {
  if (!Number.isFinite(value)) return 0;
  if (fromId === toId) return value;

  if (category === 'temperature') {
    let celsius = value;
    if (fromId === 'f') celsius = (value - 32) * (5 / 9);
    else if (fromId === 'k') celsius = value - 273.15;

    if (toId === 'f') return sanitizeFloat(celsius * (9 / 5) + 32);
    if (toId === 'k') return sanitizeFloat(celsius + 273.15);
    return sanitizeFloat(celsius);
  }

  const units = CONVERTER_UNITS[category];
  const fromUnit = units.find((u) => u.id === fromId);
  const toUnit = units.find((u) => u.id === toId);
  if (!fromUnit?.factor || !toUnit?.factor) return value;
  const baseValue = value * fromUnit.factor;
  return sanitizeFloat(baseValue / toUnit.factor);
};

export const Calculator: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isWideLayout, setIsWideLayout] = useState(false);

  const [mode, setMode] = useState<CalculatorMode>('standard');
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Standard & Scientific state
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<BinaryOperator | null>(null);
  const [lastOp, setLastOp] = useState<BinaryOperator | null>(null);
  const [lastOperand, setLastOperand] = useState<number | null>(null);
  const [shouldResetDisplay, setShouldResetDisplay] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Scientific extras
  const [isSecondFn, setIsSecondFn] = useState(false);
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('DEG');
  const [isScientificNotation, setIsScientificNotation] = useState(false);
  const [isTrigMenuOpen, setIsTrigMenuOpen] = useState(false);
  const [parenStack, setParenStack] = useState<
    Array<{ storedValue: number | null; pendingOp: BinaryOperator | null; expression: string }>
  >([]);

  // History & Memory
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [memoryList, setMemoryList] = useState<MemoryItem[]>([]);
  const [sideTab, setSideTab] = useState<'history' | 'memory'>('history');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMemoryFlyoutOpen, setIsMemoryFlyoutOpen] = useState(false);

  // Programmer mode state
  const [progValue, setProgValue] = useState<bigint>(0n);
  const [progStored, setProgStored] = useState<bigint | null>(null);
  const [progPendingOp, setProgPendingOp] = useState<ProgrammerOp | null>(null);
  const [progShouldReset, setProgShouldReset] = useState(false);
  const [progExpression, setProgExpression] = useState('');
  const [progRadix, setProgRadix] = useState<Radix>(10);
  const [wordSize, setWordSize] = useState<WordSize>('QWORD');

  // Converter mode state
  const [convInput, setConvInput] = useState('0');
  const [convFromUnit, setConvFromUnit] = useState('m');
  const [convToUnit, setConvToUnit] = useState('cm');

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width ?? 0;
      setIsWideLayout(width >= 640);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mode === 'length') {
      setConvFromUnit('m');
      setConvToUnit('cm');
      setConvInput('0');
    } else if (mode === 'weight') {
      setConvFromUnit('kg');
      setConvToUnit('g');
      setConvInput('0');
    } else if (mode === 'temperature') {
      setConvFromUnit('c');
      setConvToUnit('f');
      setConvInput('0');
    } else if (mode === 'data') {
      setConvFromUnit('gb');
      setConvToUnit('mb');
      setConvInput('0');
    } else if (mode === 'time') {
      setConvFromUnit('h');
      setConvToUnit('min');
      setConvInput('0');
    }
    setIsTrigMenuOpen(false);
    setIsMemoryFlyoutOpen(false);
  }, [mode]);

  const currentModeLabel = useMemo(() => {
    for (const group of MODE_DEFINITIONS) {
      const found = group.items.find((item) => item.id === mode);
      if (found) return found.label;
    }
    return 'Standard';
  }, [mode]);

  const isConverterMode =
    mode === 'length' || mode === 'weight' || mode === 'temperature' || mode === 'data' || mode === 'time';

  const applyBinaryOp = useCallback((a: number, b: number, op: BinaryOperator): { ok: true; value: number } | { ok: false; error: string } => {
    let result = 0;
    switch (op) {
      case '+':
        result = a + b;
        break;
      case '−':
        result = a - b;
        break;
      case '×':
        result = a * b;
        break;
      case '÷':
        if (b === 0) return { ok: false, error: 'Cannot divide by zero' };
        result = a / b;
        break;
      case 'mod':
        if (b === 0) return { ok: false, error: 'Cannot divide by zero' };
        result = a % b;
        break;
      case 'x^y':
        result = Math.pow(a, b);
        break;
      case 'y√x':
        if (b === 0) return { ok: false, error: 'Invalid input' };
        result = Math.pow(a, 1 / b);
        break;
    }
    if (Number.isNaN(result)) return { ok: false, error: 'Invalid input' };
    if (!Number.isFinite(result)) return { ok: false, error: 'Overflow' };
    return { ok: true, value: sanitizeFloat(result) };
  }, []);

  const pushHistory = useCallback((exprText: string, numericVal: number) => {
    const resStr = formatResultString(numericVal);
    setHistory((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        expression: exprText,
        result: formatDisplayNumber(resStr),
        rawValue: numericVal,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const resetAllStandard = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setStoredValue(null);
    setPendingOp(null);
    setLastOp(null);
    setLastOperand(null);
    setShouldResetDisplay(false);
    setErrorMessage(null);
    setParenStack([]);
  }, []);

  const handleDigit = useCallback(
    (digit: string) => {
      if (errorMessage) {
        setErrorMessage(null);
        setDisplay(digit);
        setExpression('');
        setStoredValue(null);
        setPendingOp(null);
        setShouldResetDisplay(false);
        return;
      }
      if (shouldResetDisplay) {
        setDisplay(digit);
        setShouldResetDisplay(false);
        if (!pendingOp && expression.includes('=')) {
          setExpression('');
        }
        return;
      }
      setDisplay((prev) => {
        if (prev === '0') return digit;
        if (prev.replace(/[-.]/g, '').length >= 16) return prev;
        return prev + digit;
      });
    },
    [errorMessage, expression, pendingOp, shouldResetDisplay]
  );

  const handleDecimal = useCallback(() => {
    if (errorMessage) {
      setErrorMessage(null);
      setDisplay('0.');
      setExpression('');
      setShouldResetDisplay(false);
      return;
    }
    if (shouldResetDisplay) {
      setDisplay('0.');
      setShouldResetDisplay(false);
      if (!pendingOp && expression.includes('=')) setExpression('');
      return;
    }
    setDisplay((prev) => (prev.includes('.') ? prev : `${prev}.`));
  }, [errorMessage, expression, pendingOp, shouldResetDisplay]);

  const handleBackspace = useCallback(() => {
    if (errorMessage) {
      resetAllStandard();
      return;
    }
    if (shouldResetDisplay) return;
    setDisplay((prev) => {
      if (prev.length <= 1 || (prev.length === 2 && prev.startsWith('-'))) return '0';
      return prev.slice(0, -1);
    });
  }, [errorMessage, resetAllStandard, shouldResetDisplay]);

  const handleClearEntry = useCallback(() => {
    if (errorMessage) {
      resetAllStandard();
      return;
    }
    setDisplay('0');
    setShouldResetDisplay(false);
  }, [errorMessage, resetAllStandard]);

  const handleToggleSign = useCallback(() => {
    if (errorMessage) return;
    setDisplay((prev) => {
      if (prev === '0' || prev === '0.') return prev;
      return prev.startsWith('-') ? prev.slice(1) : `-${prev}`;
    });
  }, [errorMessage]);

  const handleOperator = useCallback(
    (op: BinaryOperator) => {
      if (errorMessage) return;
      const currentVal = Number(display);
      const opSymbol = op === 'x^y' ? '^' : op === 'y√x' ? 'yroot' : op;

      if (pendingOp && storedValue !== null && !shouldResetDisplay) {
        const computed = applyBinaryOp(storedValue, currentVal, pendingOp);
        if (!computed.ok) {
          setErrorMessage(computed.error);
          setDisplay(computed.error);
          return;
        }
        const resStr = formatResultString(computed.value);
        setStoredValue(computed.value);
        setDisplay(resStr);
        setExpression(`${formatDisplayNumber(resStr)} ${opSymbol}`);
      } else {
        setStoredValue(currentVal);
        setExpression(`${formatDisplayNumber(display)} ${opSymbol}`);
      }

      setPendingOp(op);
      setShouldResetDisplay(true);
    },
    [applyBinaryOp, display, errorMessage, pendingOp, shouldResetDisplay, storedValue]
  );

  const handleEquals = useCallback(() => {
    if (errorMessage) {
      resetAllStandard();
      return;
    }

    const currentVal = Number(display);

    if (pendingOp && storedValue !== null) {
      const computed = applyBinaryOp(storedValue, currentVal, pendingOp);
      if (!computed.ok) {
        setErrorMessage(computed.error);
        setDisplay(computed.error);
        setStoredValue(null);
        setPendingOp(null);
        return;
      }
      const opSymbol = pendingOp === 'x^y' ? '^' : pendingOp === 'y√x' ? 'yroot' : pendingOp;
      const exprText = `${formatDisplayNumber(formatResultString(storedValue))} ${opSymbol} ${formatDisplayNumber(display)} =`;
      const resStr = formatResultString(computed.value);
      setExpression(exprText);
      setDisplay(resStr);
      setLastOp(pendingOp);
      setLastOperand(currentVal);
      setStoredValue(null);
      setPendingOp(null);
      setShouldResetDisplay(true);
      pushHistory(exprText, computed.value);
      return;
    }

    if (lastOp && lastOperand !== null) {
      const computed = applyBinaryOp(currentVal, lastOperand, lastOp);
      if (!computed.ok) {
        setErrorMessage(computed.error);
        setDisplay(computed.error);
        return;
      }
      const opSymbol = lastOp === 'x^y' ? '^' : lastOp === 'y√x' ? 'yroot' : lastOp;
      const exprText = `${formatDisplayNumber(display)} ${opSymbol} ${formatDisplayNumber(formatResultString(lastOperand))} =`;
      const resStr = formatResultString(computed.value);
      setExpression(exprText);
      setDisplay(resStr);
      setShouldResetDisplay(true);
      pushHistory(exprText, computed.value);
      return;
    }

    const exprText = `${formatDisplayNumber(display)} =`;
    setExpression(exprText);
    setShouldResetDisplay(true);
    pushHistory(exprText, currentVal);
  }, [applyBinaryOp, display, errorMessage, lastOp, lastOperand, pendingOp, pushHistory, resetAllStandard, storedValue]);

  const handlePercent = useCallback(() => {
    if (errorMessage) return;
    const currentVal = Number(display);
    let result = 0;
    if (storedValue !== null && pendingOp) {
      if (pendingOp === '+' || pendingOp === '−') {
        result = sanitizeFloat((storedValue * currentVal) / 100);
      } else {
        result = sanitizeFloat(currentVal / 100);
      }
      const opSymbol = pendingOp === 'x^y' ? '^' : pendingOp === 'y√x' ? 'yroot' : pendingOp;
      setExpression(`${formatDisplayNumber(formatResultString(storedValue))} ${opSymbol} ${formatDisplayNumber(formatResultString(result))}`);
    } else {
      result = 0;
      setExpression('0');
    }
    setDisplay(formatResultString(result));
    setShouldResetDisplay(true);
  }, [display, errorMessage, pendingOp, storedValue]);

  const handleUnaryOp = useCallback(
    (kind: string) => {
      if (errorMessage) return;
      const val = Number(display);
      const toRad = (x: number) => (angleUnit === 'DEG' ? (x * Math.PI) / 180 : x);
      const fromRad = (x: number) => (angleUnit === 'DEG' ? (x * 180) / Math.PI : x);

      let result = Number.NaN;
      let label = '';

      switch (kind) {
        case 'inv':
          if (val === 0) {
            setErrorMessage('Cannot divide by zero');
            setDisplay('Cannot divide by zero');
            return;
          }
          result = 1 / val;
          label = `1/(${formatDisplayNumber(display)})`;
          break;
        case 'sqr':
          result = val * val;
          label = `sqr(${formatDisplayNumber(display)})`;
          break;
        case 'cube':
          result = val * val * val;
          label = `cube(${formatDisplayNumber(display)})`;
          break;
        case 'sqrt':
          if (val < 0) {
            setErrorMessage('Invalid input');
            setDisplay('Invalid input');
            return;
          }
          result = Math.sqrt(val);
          label = `√(${formatDisplayNumber(display)})`;
          break;
        case 'cbrt':
          result = Math.cbrt(val);
          label = `cuberoot(${formatDisplayNumber(display)})`;
          break;
        case 'abs':
          result = Math.abs(val);
          label = `abs(${formatDisplayNumber(display)})`;
          break;
        case 'fact':
          result = factorial(val);
          label = `fact(${formatDisplayNumber(display)})`;
          break;
        case '10x':
          result = Math.pow(10, val);
          label = `10^(${formatDisplayNumber(display)})`;
          break;
        case '2x':
          result = Math.pow(2, val);
          label = `2^(${formatDisplayNumber(display)})`;
          break;
        case 'ex':
          result = Math.exp(val);
          label = `e^(${formatDisplayNumber(display)})`;
          break;
        case 'log':
          if (val <= 0) {
            setErrorMessage('Invalid input');
            setDisplay('Invalid input');
            return;
          }
          result = Math.log10(val);
          label = `log(${formatDisplayNumber(display)})`;
          break;
        case 'log2':
          if (val <= 0) {
            setErrorMessage('Invalid input');
            setDisplay('Invalid input');
            return;
          }
          result = Math.log2(val);
          label = `log₂(${formatDisplayNumber(display)})`;
          break;
        case 'ln':
          if (val <= 0) {
            setErrorMessage('Invalid input');
            setDisplay('Invalid input');
            return;
          }
          result = Math.log(val);
          label = `ln(${formatDisplayNumber(display)})`;
          break;
        case 'sin':
          result = Math.sin(toRad(val));
          label = `sin(${formatDisplayNumber(display)})`;
          break;
        case 'cos':
          result = Math.cos(toRad(val));
          label = `cos(${formatDisplayNumber(display)})`;
          break;
        case 'tan': {
          const c = Math.cos(toRad(val));
          if (Math.abs(c) < 1e-15) {
            setErrorMessage('Invalid input');
            setDisplay('Invalid input');
            return;
          }
          result = Math.tan(toRad(val));
          label = `tan(${formatDisplayNumber(display)})`;
          break;
        }
        case 'asin':
          if (val < -1 || val > 1) {
            setErrorMessage('Invalid input');
            setDisplay('Invalid input');
            return;
          }
          result = fromRad(Math.asin(val));
          label = `sin⁻¹(${formatDisplayNumber(display)})`;
          break;
        case 'acos':
          if (val < -1 || val > 1) {
            setErrorMessage('Invalid input');
            setDisplay('Invalid input');
            return;
          }
          result = fromRad(Math.acos(val));
          label = `cos⁻¹(${formatDisplayNumber(display)})`;
          break;
        case 'atan':
          result = fromRad(Math.atan(val));
          label = `tan⁻¹(${formatDisplayNumber(display)})`;
          break;
      }

      if (Number.isNaN(result)) {
        setErrorMessage('Invalid input');
        setDisplay('Invalid input');
        return;
      }
      if (!Number.isFinite(result)) {
        setErrorMessage('Overflow');
        setDisplay('Overflow');
        return;
      }

      const cleaned = sanitizeFloat(result);
      const resStr = formatResultString(cleaned);
      setDisplay(resStr);
      if (!pendingOp) {
        setExpression(label);
        pushHistory(`${label} =`, cleaned);
      }
      setShouldResetDisplay(true);
      setIsTrigMenuOpen(false);
    },
    [angleUnit, display, errorMessage, pendingOp, pushHistory]
  );

  const handleConstant = useCallback((constant: 'pi' | 'e') => {
    setErrorMessage(null);
    const val = constant === 'pi' ? Math.PI : Math.E;
    setDisplay(String(sanitizeFloat(val)));
    setShouldResetDisplay(true);
  }, []);

  const handleOpenParen = useCallback(() => {
    setParenStack((prev) => [
      ...prev,
      { storedValue, pendingOp, expression },
    ]);
    setStoredValue(null);
    setPendingOp(null);
    setExpression((prev) => `${prev ? `${prev} ` : ''}(`);
    setDisplay('0');
    setShouldResetDisplay(true);
  }, [expression, pendingOp, storedValue]);

  const handleCloseParen = useCallback(() => {
    if (parenStack.length === 0) return;
    let innerVal = Number(display);
    if (pendingOp && storedValue !== null) {
      const computed = applyBinaryOp(storedValue, innerVal, pendingOp);
      if (!computed.ok) {
        setErrorMessage(computed.error);
        setDisplay(computed.error);
        return;
      }
      innerVal = computed.value;
    }
    const frame = parenStack[parenStack.length - 1];
    setParenStack((prev) => prev.slice(0, -1));
    setStoredValue(frame.storedValue);
    setPendingOp(frame.pendingOp);
    setExpression(frame.expression);
    setDisplay(formatResultString(innerVal));
    setShouldResetDisplay(true);
  }, [applyBinaryOp, display, parenStack, pendingOp, storedValue]);

  // Memory operations
  const numericDisplay = useMemo(() => {
    const n = Number(display);
    return Number.isFinite(n) ? n : 0;
  }, [display]);

  const handleMemoryClear = () => setMemoryList([]);
  const handleMemoryRecall = () => {
    if (memoryList.length === 0) return;
    setErrorMessage(null);
    setDisplay(formatResultString(memoryList[0].value));
    setShouldResetDisplay(true);
  };
  const handleMemoryStore = () => {
    if (errorMessage) return;
    setMemoryList((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, value: numericDisplay },
      ...prev,
    ]);
    setShouldResetDisplay(true);
  };
  const handleMemoryAdd = (deltaSign: 1 | -1) => {
    if (errorMessage) return;
    const delta = numericDisplay * deltaSign;
    setMemoryList((prev) => {
      if (prev.length === 0) {
        return [{ id: `${Date.now()}-m`, value: sanitizeFloat(delta) }];
      }
      return [{ ...prev[0], value: sanitizeFloat(prev[0].value + delta) }, ...prev.slice(1)];
    });
    setShouldResetDisplay(true);
  };

  // Programmer mode operations
  const handleProgDigit = useCallback(
    (char: string) => {
      const val = parseInt(char, 16);
      if (Number.isNaN(val) || val >= progRadix) return;
      setProgValue((prev) => {
        const base = progShouldReset ? 0n : maskWord(prev, wordSize);
        const next = maskWord(base * BigInt(progRadix) + BigInt(val), wordSize);
        return next;
      });
      setProgShouldReset(false);
    },
    [progRadix, progShouldReset, wordSize]
  );

  const handleProgBackspace = useCallback(() => {
    if (progShouldReset) return;
    setProgValue((prev) => maskWord(prev / BigInt(progRadix), wordSize));
  }, [progRadix, progShouldReset, wordSize]);

  const applyProgBinary = (a: bigint, b: bigint, op: ProgrammerOp, wSize: WordSize): bigint => {
    const ua = maskWord(a, wSize);
    const ub = maskWord(b, wSize);
    const sa = toSignedBigInt(ua, wSize);
    const sb = toSignedBigInt(ub, wSize);
    let res = 0n;
    switch (op) {
      case 'AND':
        res = ua & ub;
        break;
      case 'OR':
        res = ua | ub;
        break;
      case 'XOR':
        res = ua ^ ub;
        break;
      case '<<':
        res = ua << (ub % 64n);
        break;
      case '>>':
        res = ua >> (ub % 64n);
        break;
      case '+':
        res = sa + sb;
        break;
      case '−':
        res = sa - sb;
        break;
      case '×':
        res = sa * sb;
        break;
      case '÷':
        res = sb === 0n ? 0n : sa / sb;
        break;
      case '%':
        res = sb === 0n ? 0n : sa % sb;
        break;
    }
    return maskWord(res, wSize);
  };

  const formatProgRadix = useCallback(
    (val: bigint, radix: Radix): string => {
      const masked = maskWord(val, wordSize);
      if (radix === 10) {
        return toSignedBigInt(masked, wordSize).toLocaleString('en-US');
      }
      if (radix === 16) {
        return masked.toString(16).toUpperCase().replace(/(.{4})(?=.)/g, '$1 ');
      }
      if (radix === 8) {
        return masked.toString(8).replace(/(.{3})(?=.)/g, '$1 ');
      }
      return formatGroupedBinary(masked.toString(2));
    },
    [wordSize]
  );

  const handleProgOperator = (op: ProgrammerOp) => {
    if (progPendingOp && progStored !== null && !progShouldReset) {
      const computed = applyProgBinary(progStored, progValue, progPendingOp, wordSize);
      setProgValue(computed);
      setProgStored(computed);
      setProgExpression(`${formatProgRadix(computed, progRadix)} ${op}`);
    } else {
      setProgStored(progValue);
      setProgExpression(`${formatProgRadix(progValue, progRadix)} ${op}`);
    }
    setProgPendingOp(op);
    setProgShouldReset(true);
  };

  const handleProgEquals = () => {
    if (progPendingOp && progStored !== null) {
      const computed = applyProgBinary(progStored, progValue, progPendingOp, wordSize);
      setProgExpression(
        `${formatProgRadix(progStored, progRadix)} ${progPendingOp} ${formatProgRadix(progValue, progRadix)} =`
      );
      setProgValue(computed);
      setProgStored(null);
      setProgPendingOp(null);
      setProgShouldReset(true);
    }
  };

  // Converter input handlers
  const handleConvDigit = useCallback((d: string) => {
    setConvInput((prev) => {
      if (prev === '0') return d;
      if (prev.length >= 15) return prev;
      return prev + d;
    });
  }, []);

  const handleConvDecimal = useCallback(() => {
    setConvInput((prev) => (prev.includes('.') ? prev : `${prev}.`));
  }, []);

  const handleConvBackspace = useCallback(() => {
    setConvInput((prev) => (prev.length <= 1 || (prev.length === 2 && prev.startsWith('-')) ? '0' : prev.slice(0, -1)));
  }, []);

  // Physical Keyboard support (guarded against typing in inputs/modals)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (isConverterMode) {
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          handleConvDigit(e.key);
        } else if (e.key === '.') {
          e.preventDefault();
          handleConvDecimal();
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handleConvBackspace();
        } else if (e.key === 'Escape' || e.key === 'Delete') {
          e.preventDefault();
          setConvInput('0');
        }
        return;
      }

      if (mode === 'programmer') {
        if (/^[0-9a-fA-F]$/.test(e.key)) {
          e.preventDefault();
          handleProgDigit(e.key.toUpperCase());
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handleProgBackspace();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setProgValue(0n);
          setProgStored(null);
          setProgPendingOp(null);
          setProgExpression('');
        } else if (e.key === 'Enter' || e.key === '=') {
          e.preventDefault();
          handleProgEquals();
        } else if (e.key === '+') {
          e.preventDefault();
          handleProgOperator('+');
        } else if (e.key === '-') {
          e.preventDefault();
          handleProgOperator('−');
        } else if (e.key === '*') {
          e.preventDefault();
          handleProgOperator('×');
        } else if (e.key === '/') {
          e.preventDefault();
          handleProgOperator('÷');
        }
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === '+') {
        e.preventDefault();
        handleOperator('+');
      } else if (e.key === '-') {
        e.preventDefault();
        handleOperator('−');
      } else if (e.key === '*') {
        e.preventDefault();
        handleOperator('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercent();
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        resetAllStandard();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleClearEntry();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleBackspace,
    handleClearEntry,
    handleConvBackspace,
    handleConvDecimal,
    handleConvDigit,
    handleDecimal,
    handleDigit,
    handleEquals,
    handleOperator,
    handlePercent,
    handleProgBackspace,
    handleProgDigit,
    isConverterMode,
    mode,
    resetAllStandard,
  ]);

  // Classic Windows 10 flat sharp-edged tile classes
  const digitKeyClass =
    'rounded-none bg-[#fafafa] hover:bg-[#e1e1e1] active:bg-[#cccccc] dark:bg-[#121212] dark:hover:bg-[#2b2b2b] dark:active:bg-[#3a3a3a] text-[#000000] dark:text-white flex items-center justify-center transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0067c0]';
  const fnKeyClass =
    'rounded-none bg-[#f0f0f0] hover:bg-[#dadada] active:bg-[#c6c6c6] dark:bg-[#1a1a1a] dark:hover:bg-[#303030] dark:active:bg-[#3d3d3d] text-[#000000] dark:text-white flex items-center justify-center transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0067c0]';
  const accentKeyClass =
    'rounded-none bg-[#f0f0f0] hover:bg-[#c2dcf3] active:bg-[#99c8ed] dark:bg-[#2a2a2a] dark:hover:bg-[#005a9e] dark:active:bg-[#004578] text-[#000000] dark:text-white flex items-center justify-center transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0067c0]';

  const formattedDisplay = errorMessage
    ? errorMessage
    : formatDisplayNumber(display, isScientificNotation);

  const displaySizeClass = errorMessage
    ? 'text-[22px] sm:text-[26px]'
    : formattedDisplay.length > 16
      ? 'text-[26px] sm:text-[30px]'
      : formattedDisplay.length > 11
        ? 'text-[34px] sm:text-[38px]'
        : 'text-[44px] sm:text-[48px]';

  const memoryRowButtons = [
    { label: 'MC', disabled: memoryList.length === 0, onClick: handleMemoryClear },
    { label: 'MR', disabled: memoryList.length === 0, onClick: handleMemoryRecall },
    { label: 'M+', disabled: Boolean(errorMessage), onClick: () => handleMemoryAdd(1) },
    { label: 'M−', disabled: Boolean(errorMessage), onClick: () => handleMemoryAdd(-1) },
    { label: 'MS', disabled: Boolean(errorMessage), onClick: handleMemoryStore },
    {
      label: 'M▾',
      disabled: memoryList.length === 0,
      onClick: () => {
        if (isWideLayout) {
          setSideTab('memory');
        } else {
          setIsMemoryFlyoutOpen((prev) => !prev);
        }
      },
    },
  ];

  const renderHistoryContent = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {history.length === 0 ? (
          <p className="text-[13px] font-medium text-[#5f5f5f] dark:text-[#a8a8a8] px-1 pt-2">
            There&apos;s no history yet.
          </p>
        ) : (
          history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setDisplay(formatResultString(item.rawValue));
                setExpression(item.expression);
                setShouldResetDisplay(true);
                setIsMobileDrawerOpen(false);
              }}
              className="w-full text-right px-2.5 py-2 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="text-[12px] text-[#666666] dark:text-[#a0a0a0] tabular-nums truncate">
                {item.expression}
              </div>
              <div className="text-[20px] font-semibold text-[#1a1a1a] dark:text-white tabular-nums truncate">
                {item.result}
              </div>
            </button>
          ))
        )}
      </div>
      {history.length > 0 && (
        <div className="p-2 flex justify-end border-t border-black/5 dark:border-white/10">
          <button
            type="button"
            onClick={() => setHistory([])}
            title="Clear all history"
            className="p-2 rounded-[5px] text-[#4a4a4a] dark:text-[#cccccc] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  const renderMemoryContent = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {memoryList.length === 0 ? (
          <p className="text-[13px] font-medium text-[#5f5f5f] dark:text-[#a8a8a8] px-1 pt-2">
            There&apos;s nothing saved in memory.
          </p>
        ) : (
          memoryList.map((item) => (
            <div
              key={item.id}
              className="group w-full px-2.5 py-2 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setDisplay(formatResultString(item.value));
                  setShouldResetDisplay(true);
                  setIsMemoryFlyoutOpen(false);
                  setIsMobileDrawerOpen(false);
                }}
                className="w-full text-right text-[20px] font-semibold text-[#1a1a1a] dark:text-white tabular-nums cursor-pointer"
              >
                {formatDisplayNumber(formatResultString(item.value))}
              </button>
              <div className="mt-1 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setMemoryList((prev) => prev.filter((m) => m.id !== item.id))}
                  className="px-2 py-0.5 text-[11px] font-medium rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 cursor-pointer"
                >
                  MC
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMemoryList((prev) =>
                      prev.map((m) => (m.id === item.id ? { ...m, value: sanitizeFloat(m.value + numericDisplay) } : m))
                    )
                  }
                  className="px-2 py-0.5 text-[11px] font-medium rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 cursor-pointer"
                >
                  M+
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMemoryList((prev) =>
                      prev.map((m) => (m.id === item.id ? { ...m, value: sanitizeFloat(m.value - numericDisplay) } : m))
                    )
                  }
                  className="px-2 py-0.5 text-[11px] font-medium rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 cursor-pointer"
                >
                  M−
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {memoryList.length > 0 && (
        <div className="p-2 flex justify-end border-t border-black/5 dark:border-white/10">
          <button
            type="button"
            onClick={handleMemoryClear}
            title="Clear all memory"
            className="p-2 rounded-[5px] text-[#4a4a4a] dark:text-[#cccccc] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  const converterCategory = isConverterMode ? mode : 'length';
  const converterUnits = CONVERTER_UNITS[converterCategory];
  const convertedValue = useMemo(() => {
    const val = Number(convInput);
    return convertUnitValue(converterCategory, val, convFromUnit, convToUnit);
  }, [convFromUnit, convInput, convToUnit, converterCategory]);

  return (
    <div
      ref={rootRef}
      className="w-full flex-1 h-full min-h-0 flex bg-[#e6e6e6] dark:bg-[#1f1f1f] text-[#000000] dark:text-[#f5f5f5] select-none relative overflow-hidden"
    >
      {/* Main Calculator Column */}
      <div className="flex-1 min-w-0 h-full flex flex-col">
        {/* Top Mode & Utility Header */}
        <header className="h-11 flex items-center justify-between px-1.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsNavOpen((prev) => !prev)}
              aria-label="Open Navigation"
              title="Open Navigation"
              className="w-10 h-9 flex items-center justify-center hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:bg-black/[0.1] dark:active:bg-white/[0.12] transition-colors cursor-pointer"
            >
              <Menu className="w-[18px] h-[18px]" strokeWidth={1.6} />
            </button>
            <h1 className="text-[20px] font-normal tracking-tight truncate pr-1">{currentModeLabel}</h1>
          </div>

          {!isWideLayout && (mode === 'standard' || mode === 'scientific') && (
            <button
              type="button"
              onClick={() => {
                setSideTab('history');
                setIsMobileDrawerOpen((prev) => !prev);
              }}
              aria-label="History"
              title="History"
              className="w-10 h-9 flex items-center justify-center hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <History className="w-[18px] h-[18px]" strokeWidth={1.6} />
            </button>
          )}
        </header>

        {/* STANDARD MODE */}
        {mode === 'standard' && (
          <div className="flex-1 min-h-0 flex flex-col px-1 pb-1">
            {/* Numeric Display */}
            <div className="px-3 pt-2 pb-3 min-h-[100px] flex flex-col justify-end items-end shrink-0">
              <div className="w-full text-right text-[13px] min-h-[20px] text-[#5f5f5f] dark:text-[#a8a8a8] tabular-nums truncate">
                {expression}
              </div>
              <div
                data-testid="calc-display"
                className={`w-full text-right font-semibold leading-tight tracking-tight tabular-nums truncate ${displaySizeClass}`}
              >
                {formattedDisplay}
              </div>
            </div>

            {/* Memory Bar */}
            <div className="grid grid-cols-6 gap-0 px-0.5 mb-1 shrink-0">
              {memoryRowButtons.map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  disabled={btn.disabled}
                  onClick={btn.onClick}
                  className={`h-8 text-[12px] font-semibold transition-colors ${
                    btn.disabled
                      ? 'text-[#9e9e9e] dark:text-[#636363] cursor-default'
                      : 'text-[#000000] dark:text-[#f5f5f5] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* 4x6 Classic Windows 10 Standard Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-4 grid-rows-6 gap-[2px]">
              {/* Row 1 */}
              <button type="button" onClick={handlePercent} className={`${fnKeyClass} text-[16px]`}>
                %
              </button>
              <button type="button" onClick={() => handleUnaryOp('sqrt')} className={`${fnKeyClass} text-[16px]`}>
                √
              </button>
              <button type="button" onClick={() => handleUnaryOp('sqr')} className={`${fnKeyClass} text-[16px]`}>
                <span>
                  <span className="italic font-serif">x</span>
                  <sup className="text-[10px] ml-0.5">2</sup>
                </span>
              </button>
              <button type="button" onClick={() => handleUnaryOp('inv')} className={`${fnKeyClass} text-[16px]`}>
                <span className="italic font-serif">¹/ₓ</span>
              </button>

              {/* Row 2 */}
              <button type="button" onClick={handleClearEntry} className={`${fnKeyClass} text-[14px] font-medium`}>
                CE
              </button>
              <button type="button" onClick={resetAllStandard} className={`${fnKeyClass} text-[14px] font-medium`}>
                C
              </button>
              <button type="button" onClick={handleBackspace} aria-label="Backspace" className={fnKeyClass}>
                <Delete className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={() => handleOperator('÷')} className={`${fnKeyClass} text-[22px]`}>
                ÷
              </button>

              {/* Row 3 */}
              <button type="button" onClick={() => handleDigit('7')} className={`${digitKeyClass} text-[20px] font-semibold`}>
                7
              </button>
              <button type="button" onClick={() => handleDigit('8')} className={`${digitKeyClass} text-[20px] font-semibold`}>
                8
              </button>
              <button type="button" onClick={() => handleDigit('9')} className={`${digitKeyClass} text-[20px] font-semibold`}>
                9
              </button>
              <button type="button" onClick={() => handleOperator('×')} className={`${fnKeyClass} text-[21px]`}>
                ×
              </button>

              {/* Row 4 */}
              <button type="button" onClick={() => handleDigit('4')} className={`${digitKeyClass} text-[20px] font-semibold`}>
                4
              </button>
              <button type="button" onClick={() => handleDigit('5')} className={`${digitKeyClass} text-[20px] font-semibold`}>
                5
              </button>
              <button type="button" onClick={() => handleDigit('6')} className={`${digitKeyClass} text-[20px] font-semibold`}>
                6
              </button>
              <button type="button" onClick={() => handleOperator('−')} className={`${fnKeyClass} text-[22px]`}>
                −
              </button>

              {/* Row 5 */}
              <button type="button" onClick={() => handleDigit('1')} className={`${digitKeyClass} text-[20px] font-semibold`}>
                1
              </button>
              <button type="button" onClick={() => handleDigit('2')} className={`${digitKeyClass} text-[20px] font-semibold`}>
                2
              </button>
              <button type="button" onClick={() => handleDigit('3')} className={`${digitKeyClass} text-[20px] font-semibold`}>
                3
              </button>
              <button type="button" onClick={() => handleOperator('+')} className={`${fnKeyClass} text-[22px]`}>
                +
              </button>

              {/* Row 6 */}
              <button type="button" onClick={handleToggleSign} className={`${fnKeyClass} text-[18px]`}>
                ±
              </button>
              <button type="button" onClick={() => handleDigit('0')} className={`${digitKeyClass} text-[20px] font-semibold`}>
                0
              </button>
              <button type="button" onClick={handleDecimal} className={`${fnKeyClass} text-[22px] font-semibold`}>
                .
              </button>
              <button type="button" onClick={handleEquals} className={`${accentKeyClass} text-[22px]`}>
                =
              </button>
            </div>
          </div>
        )}

        {/* SCIENTIFIC MODE */}
        {mode === 'scientific' && (
          <div className="flex-1 min-h-0 flex flex-col px-1 pb-1">
            <div className="px-3 pt-1 pb-2 min-h-[90px] flex flex-col justify-end items-end shrink-0">
              <div className="w-full text-right text-[13px] min-h-[18px] text-[#5f5f5f] dark:text-[#a8a8a8] tabular-nums truncate">
                {expression}
              </div>
              <div className={`w-full text-right font-semibold leading-tight tracking-tight tabular-nums truncate ${displaySizeClass}`}>
                {formattedDisplay}
              </div>
            </div>

            {/* Mode Strip: DEG/RAD, F-E, Trigonometry */}
            <div className="flex items-center gap-1 px-1 mb-1 relative shrink-0">
              <button
                type="button"
                onClick={() => setAngleUnit((prev) => (prev === 'DEG' ? 'RAD' : 'DEG'))}
                className="px-2.5 h-7 rounded-[4px] text-[12px] font-semibold hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
              >
                {angleUnit}
              </button>
              <button
                type="button"
                onClick={() => setIsScientificNotation((prev) => !prev)}
                className={`px-2.5 h-7 rounded-[4px] text-[12px] font-semibold transition-colors cursor-pointer ${
                  isScientificNotation
                    ? 'text-[#0067c0] dark:text-[#4cc2ff] bg-black/[0.06] dark:bg-white/[0.1]'
                    : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                }`}
              >
                F-E
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTrigMenuOpen((prev) => !prev)}
                  className="px-2.5 h-7 rounded-[4px] text-[12px] font-medium flex items-center gap-1 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
                >
                  <span>Trigonometry</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {isTrigMenuOpen && (
                  <div className="absolute left-0 top-8 z-30 w-48 p-1.5 rounded-lg bg-[#f9f9f9] dark:bg-[#2c2c2c] border border-black/10 dark:border-white/10 shadow-xl grid grid-cols-3 gap-1">
                    {(['sin', 'cos', 'tan', 'asin', 'acos', 'atan'] as const).map((fn) => (
                      <button
                        key={fn}
                        type="button"
                        onClick={() => handleUnaryOp(fn)}
                        className="h-8 rounded text-[12px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.1] cursor-pointer"
                      >
                        {fn.startsWith('a') ? `${fn.slice(1)}⁻¹` : fn}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-0.5 px-1 mb-1 shrink-0">
              {memoryRowButtons.map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  disabled={btn.disabled}
                  onClick={btn.onClick}
                  className={`h-7 rounded-none text-[12px] font-semibold transition-colors ${
                    btn.disabled
                      ? 'text-[#a3a3a3] dark:text-[#636363] cursor-default'
                      : 'text-[#1a1a1a] dark:text-[#f5f5f5] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* 5x7 Scientific Keypad */}
            <div className="flex-1 min-h-0 grid grid-cols-5 grid-rows-7 gap-[3px] px-0.5 pb-0.5 text-[13px]">
              {/* Row 1 */}
              <button
                type="button"
                onClick={() => setIsSecondFn((prev) => !prev)}
                className={`${
                  isSecondFn
                    ? 'rounded-[5px] bg-[#0067c0] text-white dark:bg-[#4cc2ff] dark:text-[#001f33] font-semibold flex items-center justify-center cursor-pointer'
                    : `${fnKeyClass} font-medium`
                }`}
              >
                2<sup className="text-[9px]">nd</sup>
              </button>
              <button type="button" onClick={() => handleConstant('pi')} className={`${fnKeyClass} italic font-serif text-[15px]`}>
                π
              </button>
              <button type="button" onClick={() => handleConstant('e')} className={`${fnKeyClass} italic font-serif text-[15px]`}>
                e
              </button>
              <button type="button" onClick={display === '0' ? resetAllStandard : handleClearEntry} className={`${fnKeyClass} font-medium`}>
                {display === '0' ? 'C' : 'CE'}
              </button>
              <button type="button" onClick={handleBackspace} aria-label="Backspace" className={fnKeyClass}>
                <Delete className="w-4 h-4" strokeWidth={1.6} />
              </button>

              {/* Row 2 */}
              <button type="button" onClick={() => handleUnaryOp(isSecondFn ? 'cube' : 'sqr')} className={fnKeyClass}>
                <span>
                  <span className="italic font-serif">x</span>
                  <sup className="text-[9px]">{isSecondFn ? '3' : '2'}</sup>
                </span>
              </button>
              <button type="button" onClick={() => handleUnaryOp('inv')} className={fnKeyClass}>
                <span className="italic font-serif">¹/ₓ</span>
              </button>
              <button type="button" onClick={() => handleUnaryOp('abs')} className={fnKeyClass}>
                |<span className="italic font-serif">x</span>|
              </button>
              <button type="button" onClick={() => handleUnaryOp('ex')} className={fnKeyClass}>
                e<sup className="text-[9px]">x</sup>
              </button>
              <button type="button" onClick={() => handleOperator('mod')} className={fnKeyClass}>
                mod
              </button>

              {/* Row 3 */}
              <button type="button" onClick={() => handleUnaryOp(isSecondFn ? 'cbrt' : 'sqrt')} className={fnKeyClass}>
                <span>
                  <sup className="text-[9px]">{isSecondFn ? '3' : '2'}</sup>√x
                </span>
              </button>
              <button type="button" onClick={handleOpenParen} className={fnKeyClass}>
                ( {parenStack.length > 0 ? <sub className="text-[9px] ml-0.5">{parenStack.length}</sub> : null}
              </button>
              <button type="button" onClick={handleCloseParen} className={fnKeyClass}>
                )
              </button>
              <button type="button" onClick={() => handleUnaryOp('fact')} className={fnKeyClass}>
                n!
              </button>
              <button type="button" onClick={() => handleOperator('÷')} className={`${fnKeyClass} text-[18px]`}>
                ÷
              </button>

              {/* Row 4 */}
              <button type="button" onClick={() => handleOperator(isSecondFn ? 'y√x' : 'x^y')} className={fnKeyClass}>
                <span>
                  {isSecondFn ? (
                    <>
                      <sup className="text-[9px]">y</sup>√x
                    </>
                  ) : (
                    <>
                      x<sup className="text-[9px]">y</sup>
                    </>
                  )}
                </span>
              </button>
              <button type="button" onClick={() => handleDigit('7')} className={`${digitKeyClass} text-[16px] font-medium`}>
                7
              </button>
              <button type="button" onClick={() => handleDigit('8')} className={`${digitKeyClass} text-[16px] font-medium`}>
                8
              </button>
              <button type="button" onClick={() => handleDigit('9')} className={`${digitKeyClass} text-[16px] font-medium`}>
                9
              </button>
              <button type="button" onClick={() => handleOperator('×')} className={`${fnKeyClass} text-[18px]`}>
                ×
              </button>

              {/* Row 5 */}
              <button type="button" onClick={() => handleUnaryOp(isSecondFn ? '2x' : '10x')} className={fnKeyClass}>
                <span>
                  {isSecondFn ? '2' : '10'}
                  <sup className="text-[9px]">x</sup>
                </span>
              </button>
              <button type="button" onClick={() => handleDigit('4')} className={`${digitKeyClass} text-[16px] font-medium`}>
                4
              </button>
              <button type="button" onClick={() => handleDigit('5')} className={`${digitKeyClass} text-[16px] font-medium`}>
                5
              </button>
              <button type="button" onClick={() => handleDigit('6')} className={`${digitKeyClass} text-[16px] font-medium`}>
                6
              </button>
              <button type="button" onClick={() => handleOperator('−')} className={`${fnKeyClass} text-[18px]`}>
                −
              </button>

              {/* Row 6 */}
              <button type="button" onClick={() => handleUnaryOp(isSecondFn ? 'log2' : 'log')} className={fnKeyClass}>
                {isSecondFn ? 'log₂' : 'log'}
              </button>
              <button type="button" onClick={() => handleDigit('1')} className={`${digitKeyClass} text-[16px] font-medium`}>
                1
              </button>
              <button type="button" onClick={() => handleDigit('2')} className={`${digitKeyClass} text-[16px] font-medium`}>
                2
              </button>
              <button type="button" onClick={() => handleDigit('3')} className={`${digitKeyClass} text-[16px] font-medium`}>
                3
              </button>
              <button type="button" onClick={() => handleOperator('+')} className={`${fnKeyClass} text-[18px]`}>
                +
              </button>

              {/* Row 7 */}
              <button type="button" onClick={() => handleUnaryOp('ln')} className={fnKeyClass}>
                ln
              </button>
              <button type="button" onClick={handleToggleSign} className={digitKeyClass}>
                ⁺/₋
              </button>
              <button type="button" onClick={() => handleDigit('0')} className={`${digitKeyClass} text-[16px] font-medium`}>
                0
              </button>
              <button type="button" onClick={handleDecimal} className={`${digitKeyClass} text-[18px] font-semibold`}>
                .
              </button>
              <button type="button" onClick={handleEquals} className={`${accentKeyClass} text-[18px] font-medium`}>
                =
              </button>
            </div>
          </div>
        )}

        {/* PROGRAMMER MODE */}
        {mode === 'programmer' && (
          <div className="flex-1 min-h-0 flex flex-col px-1.5 pb-1">
            <div className="px-2 pt-1 pb-2 flex flex-col items-end shrink-0">
              <div className="text-[12px] min-h-[18px] text-[#5f5f5f] dark:text-[#a8a8a8] tabular-nums truncate">
                {progExpression}
              </div>
              <div className="text-[32px] sm:text-[36px] font-semibold leading-tight tabular-nums truncate w-full text-right">
                {formatProgRadix(progValue, progRadix)}
              </div>
            </div>

            {/* Live Base Converters */}
            <div className="space-y-0.5 mb-2 shrink-0">
              {(
                [
                  { label: 'HEX', radix: 16 as Radix },
                  { label: 'DEC', radix: 10 as Radix },
                  { label: 'OCT', radix: 8 as Radix },
                  { label: 'BIN', radix: 2 as Radix },
                ] as const
              ).map((row) => {
                const active = progRadix === row.radix;
                return (
                  <button
                    key={row.label}
                    type="button"
                    onClick={() => setProgRadix(row.radix)}
                    className={`w-full flex items-center gap-3 px-2.5 py-1 rounded-[4px] text-left transition-colors cursor-pointer relative ${
                      active ? 'bg-black/[0.05] dark:bg-white/[0.08] font-semibold' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#0067c0] dark:bg-[#4cc2ff]" />
                    )}
                    <span className="w-8 text-[11px] font-semibold tracking-wide text-[#555] dark:text-[#bbb]">
                      {row.label}
                    </span>
                    <span className="flex-1 text-[13px] tabular-nums truncate">
                      {formatProgRadix(progValue, row.radix)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Word size + Bitwise toolbar */}
            <div className="flex items-center justify-between gap-1 px-1 mb-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const order: WordSize[] = ['QWORD', 'DWORD', 'WORD', 'BYTE'];
                  const next = order[(order.indexOf(wordSize) + 1) % order.length];
                  setWordSize(next);
                  setProgValue((prev) => maskWord(prev, next));
                }}
                className="px-2.5 h-7 rounded-[4px] text-[12px] font-semibold text-[#0067c0] dark:text-[#4cc2ff] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center gap-1 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>{wordSize}</span>
              </button>
              <div className="flex items-center gap-1">
                {(['AND', 'OR', 'XOR'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => handleProgOperator(op)}
                    className="px-2 h-7 rounded-[4px] text-[11px] font-medium hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
                  >
                    {op}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setProgValue((prev) =>
                      maskWord(prev ^ ((1n << BigInt(WORD_BITS[wordSize])) - 1n), wordSize)
                    )
                  }
                  className="px-2 h-7 rounded-[4px] text-[11px] font-medium hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
                >
                  NOT
                </button>
              </div>
            </div>

            {/* 5x6 Programmer Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-5 grid-rows-6 gap-[3px] text-[14px]">
              {/* Row 1 */}
              <button
                type="button"
                disabled={progRadix < 16}
                onClick={() => handleProgDigit('A')}
                className={`${digitKeyClass} ${progRadix < 16 ? 'opacity-35 pointer-events-none' : 'font-medium'}`}
              >
                A
              </button>
              <button type="button" onClick={() => handleProgOperator('<<')} className={fnKeyClass}>
                &lt;&lt;
              </button>
              <button type="button" onClick={() => handleProgOperator('>>')} className={fnKeyClass}>
                &gt;&gt;
              </button>
              <button
                type="button"
                onClick={() => {
                  setProgValue(0n);
                  setProgStored(null);
                  setProgPendingOp(null);
                  setProgExpression('');
                }}
                className={fnKeyClass}
              >
                C
              </button>
              <button type="button" onClick={handleProgBackspace} aria-label="Backspace" className={fnKeyClass}>
                <Delete className="w-4 h-4" strokeWidth={1.6} />
              </button>

              {/* Row 2 */}
              <button
                type="button"
                disabled={progRadix < 16}
                onClick={() => handleProgDigit('B')}
                className={`${digitKeyClass} ${progRadix < 16 ? 'opacity-35 pointer-events-none' : 'font-medium'}`}
              >
                B
              </button>
              <button type="button" onClick={() => handleProgOperator('%')} className={fnKeyClass}>
                %
              </button>
              <button type="button" onClick={() => setProgValue(0n)} className={fnKeyClass}>
                CE
              </button>
              <button
                type="button"
                onClick={() => setProgValue((prev) => maskWord(-toSignedBigInt(prev, wordSize), wordSize))}
                className={fnKeyClass}
              >
                ⁺/₋
              </button>
              <button type="button" onClick={() => handleProgOperator('÷')} className={`${fnKeyClass} text-[18px]`}>
                ÷
              </button>

              {/* Row 3 */}
              <button
                type="button"
                disabled={progRadix < 16}
                onClick={() => handleProgDigit('C')}
                className={`${digitKeyClass} ${progRadix < 16 ? 'opacity-35 pointer-events-none' : 'font-medium'}`}
              >
                C
              </button>
              {(['7', '8', '9'] as const).map((d) => {
                const disabled = Number(d) >= progRadix;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleProgDigit(d)}
                    className={`${digitKeyClass} text-[16px] font-medium ${disabled ? 'opacity-35 pointer-events-none' : ''}`}
                  >
                    {d}
                  </button>
                );
              })}
              <button type="button" onClick={() => handleProgOperator('×')} className={`${fnKeyClass} text-[18px]`}>
                ×
              </button>

              {/* Row 4 */}
              <button
                type="button"
                disabled={progRadix < 16}
                onClick={() => handleProgDigit('D')}
                className={`${digitKeyClass} ${progRadix < 16 ? 'opacity-35 pointer-events-none' : 'font-medium'}`}
              >
                D
              </button>
              {(['4', '5', '6'] as const).map((d) => {
                const disabled = Number(d) >= progRadix;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleProgDigit(d)}
                    className={`${digitKeyClass} text-[16px] font-medium ${disabled ? 'opacity-35 pointer-events-none' : ''}`}
                  >
                    {d}
                  </button>
                );
              })}
              <button type="button" onClick={() => handleProgOperator('−')} className={`${fnKeyClass} text-[18px]`}>
                −
              </button>

              {/* Row 5 */}
              <button
                type="button"
                disabled={progRadix < 16}
                onClick={() => handleProgDigit('E')}
                className={`${digitKeyClass} ${progRadix < 16 ? 'opacity-35 pointer-events-none' : 'font-medium'}`}
              >
                E
              </button>
              {(['1', '2', '3'] as const).map((d) => {
                const disabled = Number(d) >= progRadix;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleProgDigit(d)}
                    className={`${digitKeyClass} text-[16px] font-medium ${disabled ? 'opacity-35 pointer-events-none' : ''}`}
                  >
                    {d}
                  </button>
                );
              })}
              <button type="button" onClick={() => handleProgOperator('+')} className={`${fnKeyClass} text-[18px]`}>
                +
              </button>

              {/* Row 6 */}
              <button
                type="button"
                disabled={progRadix < 16}
                onClick={() => handleProgDigit('F')}
                className={`${digitKeyClass} ${progRadix < 16 ? 'opacity-35 pointer-events-none' : 'font-medium'}`}
              >
                F
              </button>
              <button type="button" disabled className={`${digitKeyClass} opacity-35 pointer-events-none`}>
                (
              </button>
              <button type="button" onClick={() => handleProgDigit('0')} className={`${digitKeyClass} text-[16px] font-medium`}>
                0
              </button>
              <button type="button" disabled className={`${digitKeyClass} opacity-35 pointer-events-none`}>
                .
              </button>
              <button type="button" onClick={handleProgEquals} className={`${accentKeyClass} text-[18px] font-medium`}>
                =
              </button>
            </div>
          </div>
        )}

        {/* UNIT CONVERTER MODES */}
        {isConverterMode && (
          <div className="flex-1 min-h-0 flex flex-col px-2 pb-1">
            <div className="px-2 pt-2 pb-3 space-y-4 shrink-0">
              {/* From */}
              <div>
                <div className="text-[36px] font-semibold tabular-nums leading-tight truncate">
                  {formatDisplayNumber(convInput)}
                </div>
                <select
                  aria-label="Convert from unit"
                  value={convFromUnit}
                  onChange={(e) => setConvFromUnit(e.target.value)}
                  className="mt-1 bg-transparent text-[13px] font-medium text-[#333] dark:text-[#e5e5e5] py-1 pr-2 rounded hover:bg-black/[0.05] dark:hover:bg-white/[0.08] focus:outline-none cursor-pointer"
                >
                  {converterUnits.map((u) => (
                    <option key={u.id} value={u.id} className="bg-white dark:bg-[#2c2c2c]">
                      {u.label} ({u.short})
                    </option>
                  ))}
                </select>
              </div>

              {/* To */}
              <div>
                <div className="text-[32px] font-normal tabular-nums leading-tight text-[#2b2b2b] dark:text-[#e0e0e0] truncate">
                  {formatDisplayNumber(formatResultString(convertedValue))}
                </div>
                <select
                  aria-label="Convert to unit"
                  value={convToUnit}
                  onChange={(e) => setConvToUnit(e.target.value)}
                  className="mt-1 bg-transparent text-[13px] font-medium text-[#333] dark:text-[#e5e5e5] py-1 pr-2 rounded hover:bg-black/[0.05] dark:hover:bg-white/[0.08] focus:outline-none cursor-pointer"
                >
                  {converterUnits.map((u) => (
                    <option key={u.id} value={u.id} className="bg-white dark:bg-[#2c2c2c]">
                      {u.label} ({u.short})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-3 grid-rows-5 gap-[3px] pb-0.5">
              <div />
              <button type="button" onClick={() => setConvInput('0')} className={`${fnKeyClass} text-[14px] font-medium`}>
                CE
              </button>
              <button type="button" onClick={handleConvBackspace} aria-label="Backspace" className={fnKeyClass}>
                <Delete className="w-4 h-4" strokeWidth={1.6} />
              </button>

              {(['7', '8', '9', '4', '5', '6', '1', '2', '3'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleConvDigit(d)}
                  className={`${digitKeyClass} text-[18px] font-medium`}
                >
                  {d}
                </button>
              ))}

              <button
                type="button"
                disabled={converterCategory !== 'temperature'}
                onClick={() =>
                  setConvInput((prev) =>
                    prev === '0' ? prev : prev.startsWith('-') ? prev.slice(1) : `-${prev}`
                  )
                }
                className={`${digitKeyClass} text-[15px] ${
                  converterCategory !== 'temperature' ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                ⁺/₋
              </button>
              <button type="button" onClick={() => handleConvDigit('0')} className={`${digitKeyClass} text-[18px] font-medium`}>
                0
              </button>
              <button type="button" onClick={handleConvDecimal} className={`${digitKeyClass} text-[20px] font-semibold`}>
                .
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wide Side Panel: History & Memory */}
      {isWideLayout && (mode === 'standard' || mode === 'scientific') && (
        <aside className="w-[260px] lg:w-[290px] shrink-0 h-full border-l border-black/[0.06] dark:border-white/[0.08] flex flex-col bg-[#f3f3f3]/70 dark:bg-[#202020]/70">
          <div className="flex items-center gap-5 px-4 pt-3 pb-1 shrink-0">
            <button
              type="button"
              onClick={() => setSideTab('history')}
              className={`pb-1.5 text-[14px] font-semibold border-b-[3px] transition-colors cursor-pointer ${
                sideTab === 'history'
                  ? 'border-[#0067c0] dark:border-[#4cc2ff] text-[#1a1a1a] dark:text-white'
                  : 'border-transparent text-[#666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white'
              }`}
            >
              History
            </button>
            <button
              type="button"
              onClick={() => setSideTab('memory')}
              className={`pb-1.5 text-[14px] font-semibold border-b-[3px] transition-colors cursor-pointer ${
                sideTab === 'memory'
                  ? 'border-[#0067c0] dark:border-[#4cc2ff] text-[#1a1a1a] dark:text-white'
                  : 'border-transparent text-[#666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white'
              }`}
            >
              Memory
            </button>
          </div>
          {sideTab === 'history' ? renderHistoryContent() : renderMemoryContent()}
        </aside>
      )}

      {/* Compact Overlay History / Memory Sheet */}
      {!isWideLayout && (isMobileDrawerOpen || isMemoryFlyoutOpen) && (
        <div
          className="absolute inset-0 z-30 flex flex-col justify-end bg-black/20 dark:bg-black/40"
          onClick={() => {
            setIsMobileDrawerOpen(false);
            setIsMemoryFlyoutOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-[68%] bg-[#f3f3f3] dark:bg-[#272727] rounded-t-xl border-t border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/5 dark:border-white/10">
              <span className="text-[14px] font-semibold">
                {isMemoryFlyoutOpen ? 'Memory' : 'History'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsMemoryFlyoutOpen(false);
                }}
                className="w-7 h-7 rounded-[4px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {isMemoryFlyoutOpen ? renderMemoryContent() : renderHistoryContent()}
          </div>
        </div>
      )}

      {/* Navigation Mode Drawer */}
      {isNavOpen && (
        <div
          className="absolute inset-0 z-40 flex bg-black/20 dark:bg-black/40"
          onClick={() => setIsNavOpen(false)}
        >
          <nav
            aria-label="Calculator modes"
            onClick={(e) => e.stopPropagation()}
            className="w-[244px] max-w-[85%] h-full bg-[#f3f3f3] dark:bg-[#272727] border-r border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-y-auto py-2 px-1.5"
          >
            <div className="flex items-center px-1 mb-2">
              <button
                type="button"
                onClick={() => setIsNavOpen(false)}
                aria-label="Close Navigation"
                className="w-9 h-8 rounded-[5px] flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
              >
                <Menu className="w-[18px] h-[18px]" strokeWidth={1.7} />
              </button>
            </div>

            {MODE_DEFINITIONS.map((group) => (
              <div key={group.section} className="mb-3">
                <div className="px-3 py-1.5 text-[12px] font-semibold text-[#5f5f5f] dark:text-[#a8a8a8]">
                  {group.section}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setMode(item.id);
                          setIsNavOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-[5px] text-[13.5px] transition-colors relative cursor-pointer ${
                          active
                            ? 'bg-black/[0.06] dark:bg-white/[0.1] font-semibold text-[#1a1a1a] dark:text-white'
                            : 'text-[#2c2c2c] dark:text-[#e4e4e4] hover:bg-black/[0.04] dark:hover:bg-white/[0.07]'
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#0067c0] dark:bg-[#4cc2ff]" />
                        )}
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};

export default Calculator;
