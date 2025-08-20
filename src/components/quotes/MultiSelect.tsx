"use client";

import { useState, useEffect, useRef } from "react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export default function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Sélectionner...",
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOptionClick = (optionValue: string) => {
    const newValues = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValues);
  };

  const handleRemoveValue = (valueToRemove: string) => {
    const newValues = value.filter((v) => v !== valueToRemove);
    onChange(newValues);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-center">
          <span className="text-gray-700">{placeholder}</span>
          <svg
            className="h-5 w-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {isOpen && (
        <div className="absolute w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10">
          <input
            type="text"
            placeholder="rechercher / Créer des mots-clés"
            className="w-full px-3 py-2 border-b focus:outline-none focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="max-h-60 overflow-auto">
            {options
              .filter((option) =>
                option.label.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((option) => (
                <div
                  key={option.value}
                  className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick(option.value);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(option.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    readOnly
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    {option.label}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {value.map((selectedValue) => {
          const option = options.find((o) => o.value === selectedValue);
          return option ? (
            <div
              key={selectedValue}
              className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-sm"
            >
              <span>{option.label}</span>
              <button
                type="button"
                className="ml-1 text-gray-500 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveValue(selectedValue);
                }}
              >
                ×
              </button>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
