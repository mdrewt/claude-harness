// synthetic: bodies that differ in one string, template or numeric literal, each kind in both orders, and one true pair
import { describe, expect, it } from 'vitest';

describe('format', () => {
  it('pads a spaced word', () => {
    expect(pad('a b')).toBe(5);
  });

  it('pads a doubly spaced word', () => {
    expect(pad('a  b')).toBe(5);
  });

  it('pads c d doubly', () => {
    expect(pad('c  d')).toBe(6);
  });

  it('pads c d singly', () => {
    expect(pad('c d')).toBe(6);
  });

  it('labels with a template', () => {
    expect(label(`x ${n}`)).toBe(1);
  });

  it('labels with a wider template', () => {
    expect(label(`x  ${n}`)).toBe(1);
  });

  it('labels a plain wide template', () => {
    expect(label(`q  r`)).toBe(2);
  });

  it('labels a plain template', () => {
    expect(label(`q r`)).toBe(2);
  });

  it('scales two', () => {
    expect(scale(2)).toBe(4);
  });

  it('scales three', () => {
    expect(scale(3)).toBe(4);
  });

  it('scales one and a half, long form', () => {
    expect(scale(1.50)).toBe(3);
  });

  it('scales one and a half', () => {
    expect(scale(1.5)).toBe(3);
  });

  it('trims a word', () => {
    expect(pad('w')).toBe(1);
  });

  it('trims a word twice', () => {
    expect(pad('w')).toBe(1);
  });
});
