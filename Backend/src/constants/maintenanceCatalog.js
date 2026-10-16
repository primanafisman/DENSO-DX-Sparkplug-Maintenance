// Reviewed transcription: 37 visible checklist rows plus seven charts.
export const CATALOG=[
  {
    "id": "packing_depth_tool",
    "definition_version": 1,
    "source_number": 1,
    "display_order": 1,
    "name": "Packing Depth Tool",
    "group": "packing",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka, Scratch atau Gompal",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "start_process"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "1/Shift pada awal proses."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 1
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "master_packing",
    "definition_version": 1,
    "source_number": 2,
    "display_order": 2,
    "name": "Pengecekan Master Packing Check",
    "group": "packing",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Zero 8.25 ± 0.02; Plus 9.25 ± 0.02; Minus 7.25 ± 0.02. Semua display CMPLT On.",
    "method_text": "Tekan tombol completed master Zero, Plus (+), Minus (-); pastikan lampu hijau / display CMPLT On.",
    "tool": "Visual Check",
    "requirement_tags": [
      "complete_master"
    ],
    "requirements": [
      {
        "id": "complete_master",
        "label": "Completed master / lampu hijau"
      }
    ],
    "intervals": [
      "weekly"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "weekly",
      "description": "1 kali per minggu",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "zero",
        "label": "Zero"
      },
      {
        "id": "plus",
        "label": "Plus (+)"
      },
      {
        "id": "minus",
        "label": "Minus (-)"
      }
    ],
    "sample_count": 3,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 2
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "master_ok_packing",
    "definition_version": 1,
    "source_number": 3,
    "display_order": 3,
    "name": "Master OK Packing Check",
    "group": "packing",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Master OK judge OK; tidak terdeteksi NG.",
    "method_text": "Jalankan Master OK dan periksa penilaian mesin.",
    "tool": "Master OK Washer",
    "requirement_tags": [
      "master_ok"
    ],
    "requirements": [
      {
        "id": "master_ok",
        "label": "Master OK dinilai OK"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 3
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "ng_master_packing",
    "definition_version": 1,
    "source_number": 4,
    "display_order": 4,
    "name": "NG Master Check — Tidak ada Washer / Washer Double",
    "group": "packing",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Pokayoke NG Auto Reject untuk washer kosong dan double.",
    "method_text": "Master NG terdeteksi pokayoke dan Auto Reject; periksa setiap master yang tercantum.",
    "tool": "Master NG Washer Kosong & Double",
    "requirement_tags": [
      "auto_reject"
    ],
    "requirements": [
      {
        "id": "auto_reject",
        "label": "Master NG terdeteksi dan auto reject"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "missing",
        "label": "Washer kosong"
      },
      {
        "id": "double",
        "label": "Washer double"
      }
    ],
    "sample_count": 2,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 4
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "lower_ring_chuck",
    "definition_version": 1,
    "source_number": 5,
    "display_order": 5,
    "name": "Check Lower Tool Lower Ring Insert (Chuck)",
    "group": "lower_ring",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka, Scratch, Gompal dan tidak ada Magnet",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage",
      "non_magnetic"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      },
      {
        "id": "non_magnetic",
        "label": "Tidak bermagnet"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 5
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "ring_housing_position",
    "definition_version": 1,
    "source_number": 6,
    "display_order": 6,
    "name": "Check posisi Ring masuk kedalam Housing",
    "group": "lower_ring",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Posisi Ring sempurna ke Housing",
    "method_text": "Lihat dan pastikan Ring masuk ke dalam Housing dengan sempurna.",
    "tool": "Visual Check",
    "requirement_tags": [
      "correct_position"
    ],
    "requirements": [
      {
        "id": "correct_position",
        "label": "Posisi pemasangan benar"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 6
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "lower_press_dies",
    "definition_version": 1,
    "source_number": 7,
    "display_order": 7,
    "name": "Check Lower Press Tool (Dies)",
    "group": "lower_ring",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka, Scratch, Gompal dan tidak bermagnet",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage",
      "non_magnetic"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      },
      {
        "id": "non_magnetic",
        "label": "Tidak bermagnet"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 7
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "actual_load_lower_ring",
    "definition_version": 1,
    "source_number": 8,
    "display_order": 8,
    "name": "Check Actual Load Lower Ring Press",
    "group": "lower_ring",
    "process": "Spark Plug Final Assy",
    "kind": "numeric",
    "input_method": "photo",
    "standard_text": "7.5 ± 0.5 kN (7.0–8.0 kN)",
    "method_text": "Unggah foto Load Cell untuk setiap sampel; konfirmasi angka hasil CV/OCR lokal.",
    "tool": "Load Cell (Janome)",
    "requirement_tags": [
      "within_limits"
    ],
    "requirements": [
      {
        "id": "within_limits",
        "label": "Angka berada dalam batas standar"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      }
    ],
    "sample_count": 4,
    "unit": "kN",
    "limits": {
      "minimum": 7.0,
      "maximum": 8.0
    },
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 8
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "lowering_depth_tool",
    "definition_version": 1,
    "source_number": 9,
    "display_order": 9,
    "name": "Lowering Depth Tool",
    "group": "lower_ring",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka, Scratch atau Gompal",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 9
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "master_lowering_depth",
    "definition_version": 1,
    "source_number": 10,
    "display_order": 10,
    "name": "Pengecekan Master Lowering Depth Check",
    "group": "lower_ring",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Zero, NG (-), NG (+): display CMPLT On.",
    "method_text": "Tekan tombol completed master Zero, Plus (+), Minus (-); pastikan lampu hijau / display CMPLT On.",
    "tool": "Master Jig",
    "requirement_tags": [
      "complete_master"
    ],
    "requirements": [
      {
        "id": "complete_master",
        "label": "Completed master / lampu hijau"
      }
    ],
    "intervals": [
      "weekly"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "weekly",
      "description": "1 kali per minggu",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "zero",
        "label": "Zero"
      },
      {
        "id": "plus",
        "label": "Plus (+)"
      },
      {
        "id": "minus",
        "label": "Minus (-)"
      }
    ],
    "sample_count": 3,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 10
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "master_ok_lowering",
    "definition_version": 1,
    "source_number": 11,
    "display_order": 11,
    "name": "Master OK Lowering Depth Check",
    "group": "lower_ring",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Master OK judge OK; tidak terdeteksi NG.",
    "method_text": "Jalankan Master OK Lower Ring.",
    "tool": "Master OK Lower Ring",
    "requirement_tags": [
      "master_ok"
    ],
    "requirements": [
      {
        "id": "master_ok",
        "label": "Master OK dinilai OK"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 11
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "ng_master_lowering",
    "definition_version": 1,
    "source_number": 12,
    "display_order": 12,
    "name": "NG Master Check — Tidak Ada Ring / Ring Double",
    "group": "lower_ring",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Pokayoke NG Auto Reject untuk Ring kosong dan double.",
    "method_text": "Master NG terdeteksi pokayoke dan Auto Reject; periksa setiap master yang tercantum.",
    "tool": "Master NG Ring Double & Kosong",
    "requirement_tags": [
      "auto_reject"
    ],
    "requirements": [
      {
        "id": "auto_reject",
        "label": "Master NG terdeteksi dan auto reject"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "missing",
        "label": "Ring kosong"
      },
      {
        "id": "double",
        "label": "Ring double"
      }
    ],
    "sample_count": 2,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 12
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "appearance_talc",
    "definition_version": 1,
    "source_number": 13,
    "display_order": 13,
    "name": "Appearance Check Talc Ring",
    "group": "talc",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Type Talc benar, tidak gompal / pecah",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage",
      "correct_type"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      },
      {
        "id": "correct_type",
        "label": "Jenis / tipe sesuai"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      }
    ],
    "sample_count": 4,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 13
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "talc_press_tool",
    "definition_version": 1,
    "source_number": 14,
    "display_order": 14,
    "name": "Talc Press Tool Visual Check / Talc Ring Press",
    "group": "talc",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka, Rusak atau Scratch",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 14
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "talc_sweeping_tool",
    "definition_version": 1,
    "source_number": 15,
    "display_order": 15,
    "name": "Check Talc Ring Sweeping Tool Visual Check",
    "group": "sweeping",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka, Scratch atau Gompal",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 15
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "pin_sweeping_tool",
    "definition_version": 1,
    "source_number": 16,
    "display_order": 16,
    "name": "Appearance Check Pin Sweeping Depth Check",
    "group": "sweeping",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka, Scratch atau Gompal",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084422.jpg",
      "number": 16
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "master_ok_upper_ring",
    "definition_version": 1,
    "source_number": 24,
    "display_order": 24,
    "name": "Master OK Upper Ring Depth Check",
    "group": "upper_ring",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Master OK judge OK; tidak terdeteksi NG.",
    "method_text": "Jalankan Master OK Upper Ring Depth.",
    "tool": "Master OK Upper Ring Depth",
    "requirement_tags": [
      "master_ok"
    ],
    "requirements": [
      {
        "id": "master_ok",
        "label": "Master OK dinilai OK"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084532.jpg",
      "number": 24
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "function_upper_ring",
    "definition_version": 1,
    "source_number": 25,
    "display_order": 25,
    "name": "Function Check Upper Ring Depth Check",
    "group": "upper_ring",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "NG Depth (+/-) terdeteksi pokayoke, Master NG Auto Reject.",
    "method_text": "Master NG terdeteksi pokayoke dan Auto Reject; periksa setiap master yang tercantum.",
    "tool": "NG U/R Depth (+), NG U/R Depth (-)",
    "requirement_tags": [
      "auto_reject"
    ],
    "requirements": [
      {
        "id": "auto_reject",
        "label": "Master NG terdeteksi dan auto reject"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "plus",
        "label": "NG Depth (+)"
      },
      {
        "id": "minus",
        "label": "NG Depth (-)"
      }
    ],
    "sample_count": 2,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084532.jpg",
      "number": 25
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "master_ok_hexagon_before",
    "definition_version": 1,
    "source_number": 26,
    "display_order": 26,
    "name": "Master OK Hexagon Size Check (Before Caulking)",
    "group": "hexagon_before",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Master OK judge OK; tidak terdeteksi NG.",
    "method_text": "Jalankan Master OK Hexagon Before.",
    "tool": "Master OK Hexagon Before",
    "requirement_tags": [
      "master_ok"
    ],
    "requirements": [
      {
        "id": "master_ok",
        "label": "Master OK dinilai OK"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084532.jpg",
      "number": 26
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "master_hexagon_before",
    "definition_version": 1,
    "source_number": 27,
    "display_order": 27,
    "name": "Master Check Hexagon Size Check (Before Caulking)",
    "group": "hexagon_before",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Lampu master hijau / CMPLT On. Zero 15.75 ± 0.01; NG (-) 15.63; NG (+) 15.87.",
    "method_text": "Tekan tombol completed master Zero, Plus (+), Minus (-); pastikan lampu hijau / display CMPLT On.",
    "tool": "Visual Check",
    "requirement_tags": [
      "complete_master"
    ],
    "requirements": [
      {
        "id": "complete_master",
        "label": "Completed master / lampu hijau"
      }
    ],
    "intervals": [
      "weekly"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "weekly",
      "description": "1 kali per minggu",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "zero",
        "label": "Zero"
      },
      {
        "id": "plus",
        "label": "Plus (+)"
      },
      {
        "id": "minus",
        "label": "Minus (-)"
      }
    ],
    "sample_count": 3,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084532.jpg",
      "number": 27
    },
    "review_notes": [
      "Toleransi kecil fixture NG pada foto perlu verifikasi; bukan angka yang dinilai sebagai pengukuran operator."
    ],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "function_hexagon_before",
    "definition_version": 1,
    "source_number": 28,
    "display_order": 28,
    "name": "Function Check Hexagon Size (Before Caulking)",
    "group": "hexagon_before",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Pokayoke NG Auto Reject.",
    "method_text": "Master NG terdeteksi pokayoke dan Auto Reject; periksa setiap master yang tercantum.",
    "tool": "NG Hexagon (+), NG Hexagon (-)",
    "requirement_tags": [
      "auto_reject"
    ],
    "requirements": [
      {
        "id": "auto_reject",
        "label": "Master NG terdeteksi dan auto reject"
      }
    ],
    "intervals": [
      "every_4_hours"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "every_4_hours",
      "description": "1 kali per 4 jam",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "H1",
        "label": "Master H1"
      },
      {
        "id": "H2",
        "label": "Master H2"
      }
    ],
    "sample_count": 2,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084532.jpg",
      "number": 28
    },
    "review_notes": [
      "Grid menggunakan H1/H2; pemetaan ke master plus/minus perlu ditetapkan operator."
    ],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "hexagon_tool_before",
    "definition_version": 1,
    "source_number": 29,
    "display_order": 29,
    "name": "Hexagon Check Tool Visual Check (Before Caulking)",
    "group": "hexagon_before",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka dan tidak Gompal",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084532.jpg",
      "number": 29
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "cold_caulking_tool",
    "definition_version": 1,
    "source_number": 30,
    "display_order": 30,
    "name": "Check Cold Caulking Tool",
    "group": "caulking",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka, Scratch atau Gompal",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084532.jpg",
      "number": 30
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "caulking_load",
    "definition_version": 1,
    "source_number": 31,
    "display_order": 31,
    "name": "Caulking Load",
    "group": "caulking",
    "process": "Spark Plug Final Assy",
    "kind": "numeric",
    "input_method": "photo",
    "standard_text": "29–41 kN",
    "method_text": "Unggah foto Load Cell Servo setiap sampel dan konfirmasi angka aktual.",
    "tool": "Load Cell Servo",
    "requirement_tags": [
      "within_limits"
    ],
    "requirements": [
      {
        "id": "within_limits",
        "label": "Angka berada dalam batas standar"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      }
    ],
    "sample_count": 4,
    "unit": "kN",
    "limits": {
      "minimum": 29.0,
      "maximum": 41.0
    },
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084532.jpg",
      "number": 31
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "master_hexagon_after",
    "definition_version": 1,
    "source_number": 32,
    "display_order": 32,
    "name": "Master Check Hexagon Size Check (After Caulking)",
    "group": "hexagon_after",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Lampu master hijau / CMPLT On. Zero 15.86 ± 0.01; NG (-) 15.70; NG (+) 16.02.",
    "method_text": "Tekan tombol completed master Zero, Plus (+), Minus (-); pastikan lampu hijau / display CMPLT On.",
    "tool": "Visual Check",
    "requirement_tags": [
      "complete_master"
    ],
    "requirements": [
      {
        "id": "complete_master",
        "label": "Completed master / lampu hijau"
      }
    ],
    "intervals": [
      "weekly"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "weekly",
      "description": "1 kali per minggu",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "zero",
        "label": "Zero"
      },
      {
        "id": "plus",
        "label": "Plus (+)"
      },
      {
        "id": "minus",
        "label": "Minus (-)"
      }
    ],
    "sample_count": 3,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 32
    },
    "review_notes": [
      "Bagian atas tabel terlipat; toleransi fixture NG perlu verifikasi."
    ],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "master_ok_hexagon_after",
    "definition_version": 1,
    "source_number": 33,
    "display_order": 33,
    "name": "Master OK Hexagon Size Check (After Caulking)",
    "group": "hexagon_after",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Master OK judge OK; tidak terdeteksi NG.",
    "method_text": "Jalankan Master OK Hexagon After.",
    "tool": "Master OK Hexagon After",
    "requirement_tags": [
      "master_ok"
    ],
    "requirements": [
      {
        "id": "master_ok",
        "label": "Master OK dinilai OK"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 33
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "function_hexagon_after",
    "definition_version": 1,
    "source_number": 34,
    "display_order": 34,
    "name": "Function Check Hexagon Size (After Caulking)",
    "group": "hexagon_after",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Pokayoke NG Auto Reject. Master NG (+) SPA.U.12 >16.00; NG (-) SPA.U.11 <15.73.",
    "method_text": "Master NG terdeteksi pokayoke dan Auto Reject; periksa setiap master yang tercantum.",
    "tool": "NG Master (+), NG Master (-)",
    "requirement_tags": [
      "auto_reject"
    ],
    "requirements": [
      {
        "id": "auto_reject",
        "label": "Master NG terdeteksi dan auto reject"
      }
    ],
    "intervals": [
      "every_4_hours"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "every_4_hours",
      "description": "1 kali per 4 jam",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "H1",
        "label": "Master H1"
      },
      {
        "id": "H2",
        "label": "Master H2"
      }
    ],
    "sample_count": 2,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 34
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "hexagon_tool_after",
    "definition_version": 1,
    "source_number": 35,
    "display_order": 35,
    "name": "Visual Check Hexagon Check Tool (After Caulking)",
    "group": "hexagon_after",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka atau Scratch",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 35
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "hexagon_difference",
    "definition_version": 1,
    "source_number": 36,
    "display_order": 36,
    "name": "Hexagon Diff. Check",
    "group": "hexagon_after",
    "process": "Spark Plug Final Assy",
    "kind": "difference",
    "input_method": "photo_difference",
    "standard_text": "Selisih 0.05–0.25 mm",
    "method_text": "Unggah foto sebelum dan sesudah caulking tiap sampel; selisih = sesudah − sebelum.",
    "tool": "Blade Micrometer (0.01 mm)",
    "requirement_tags": [
      "within_limits",
      "difference_limits"
    ],
    "requirements": [
      {
        "id": "within_limits",
        "label": "Angka berada dalam batas standar"
      },
      {
        "id": "difference_limits",
        "label": "Selisih sebelum / sesudah sesuai standar"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      }
    ],
    "sample_count": 4,
    "unit": "mm",
    "limits": {
      "minimum": 0.05,
      "maximum": 0.25
    },
    "resolution": 0.01,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 36
    },
    "review_notes": [
      "Arah selisih ditetapkan sesudah − sebelum; konfirmasikan dengan prosedur lapangan bila berbeda."
    ],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "caulking_height_tool",
    "definition_version": 1,
    "source_number": 37,
    "display_order": 37,
    "name": "Caulking Height Tool Visual Check",
    "group": "caulking",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka, Scratch atau Gompal",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 37
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "master_caulking_height",
    "definition_version": 1,
    "source_number": 38,
    "display_order": 38,
    "name": "Master Check Caulking Height",
    "group": "caulking",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Lampu master hijau / CMPLT On. Zero 15 ± 0.01; NG (-) 14.90; NG (+) 15.10.",
    "method_text": "Tekan tombol completed master Zero, Plus (+), Minus (-); pastikan lampu hijau / display CMPLT On.",
    "tool": "Visual Check",
    "requirement_tags": [
      "complete_master"
    ],
    "requirements": [
      {
        "id": "complete_master",
        "label": "Completed master / lampu hijau"
      }
    ],
    "intervals": [
      "weekly"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "weekly",
      "description": "1 kali per minggu",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "zero",
        "label": "Zero"
      },
      {
        "id": "plus",
        "label": "Plus (+)"
      },
      {
        "id": "minus",
        "label": "Minus (-)"
      }
    ],
    "sample_count": 3,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 38
    },
    "review_notes": [
      "Toleransi kecil fixture NG perlu verifikasi dari dokumen yang lebih jelas."
    ],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "master_ok_caulking_height",
    "definition_version": 1,
    "source_number": 39,
    "display_order": 39,
    "name": "Master OK Caulking Height Check",
    "group": "caulking",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Master OK judge OK; tidak terdeteksi NG.",
    "method_text": "Jalankan Master OK Caulking Height.",
    "tool": "Visual Check",
    "requirement_tags": [
      "master_ok"
    ],
    "requirements": [
      {
        "id": "master_ok",
        "label": "Master OK dinilai OK"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 39
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "function_caulking_height",
    "definition_version": 1,
    "source_number": 40,
    "display_order": 40,
    "name": "Function Check Master NG Caulking Height",
    "group": "caulking",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Pokayoke NG Auto Reject. NG (+) SPA.U.09 >15.10; NG (-) SPA.U.10 <14.90.",
    "method_text": "Master NG terdeteksi pokayoke dan Auto Reject; periksa setiap master yang tercantum.",
    "tool": "NG Master (+), NG Master (-)",
    "requirement_tags": [
      "auto_reject"
    ],
    "requirements": [
      {
        "id": "auto_reject",
        "label": "Master NG terdeteksi dan auto reject"
      }
    ],
    "intervals": [
      "every_4_hours"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "every_4_hours",
      "description": "1 kali per 4 jam",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "H1",
        "label": "Master H1"
      },
      {
        "id": "H2",
        "label": "Master H2"
      }
    ],
    "sample_count": 2,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 40
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "master_ok_spark",
    "definition_version": 1,
    "source_number": 41,
    "display_order": 41,
    "name": "Function Check Master OK Spark Test",
    "group": "spark_test",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Judge OK; Master OK tidak terdeteksi NG.",
    "method_text": "Jalankan keenam master dan pilih OK bila seluruh respons sesuai.",
    "tool": "6 Pcs Master OK",
    "requirement_tags": [
      "master_ok"
    ],
    "requirements": [
      {
        "id": "master_ok",
        "label": "Master OK dinilai OK"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": 6,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 41
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "master_ng_spark",
    "definition_version": 1,
    "source_number": 42,
    "display_order": 42,
    "name": "Function Check Master NG Spark Test",
    "group": "spark_test",
    "process": "Spark Plug Final Assy",
    "kind": "functional",
    "input_method": "ok_ng",
    "standard_text": "Judge NG; Master NG terdeteksi pokayoke dan Auto Reject.",
    "method_text": "Jalankan keenam master NG dan periksa deteksi serta reject.",
    "tool": "6 Pcs Master NG",
    "requirement_tags": [
      "auto_reject"
    ],
    "requirements": [
      {
        "id": "auto_reject",
        "label": "Master NG terdeteksi dan auto reject"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": 6,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 42
    },
    "review_notes": [],
    "outcome_guide": "OK = respons master sesuai persyaratan, termasuk deteksi NG dan reject bila diwajibkan."
  },
  {
    "id": "gasket_position",
    "definition_version": 1,
    "source_number": 43,
    "display_order": 43,
    "name": "Check Posisi Gasket Ring",
    "group": "gasket",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Posisi benar, tidak nangkring, tidak double dan tidak salah type.",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "correct_position",
      "correct_type"
    ],
    "requirements": [
      {
        "id": "correct_position",
        "label": "Posisi pemasangan benar"
      },
      {
        "id": "correct_type",
        "label": "Jenis / tipe sesuai"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 43
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "gasket_press_dies",
    "definition_version": 1,
    "source_number": 44,
    "display_order": 44,
    "name": "Gasket Press Dies Visual Check",
    "group": "gasket",
    "process": "Spark Plug Final Assy",
    "kind": "visual",
    "input_method": "ok_ng",
    "standard_text": "Tidak luka, Scratch atau Gompal",
    "method_text": "Tool dilihat dan diraba; pilih OK jika seluruh persyaratan terpenuhi, selain itu NG.",
    "tool": "Visual Check",
    "requirement_tags": [
      "no_damage"
    ],
    "requirements": [
      {
        "id": "no_damage",
        "label": "Tidak luka / scratch / gompal"
      }
    ],
    "intervals": [
      "per_shift"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "per_shift",
      "description": "1 kali per shift",
      "day": {
        "times": [],
        "window": null
      },
      "night": {
        "times": [],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "check",
        "label": "Hasil pemeriksaan"
      }
    ],
    "sample_count": 1,
    "unit": null,
    "limits": null,
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084608.jpg",
      "number": 44
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "chart_depth_after_press",
    "definition_version": 1,
    "source_number": null,
    "display_order": 101,
    "name": "Depth After Press Check",
    "group": "lower_ring",
    "process": "Spark Plug Final Assy",
    "kind": "numeric",
    "input_method": "photo",
    "standard_text": "6.00–6.70 mm",
    "method_text": "Unggah foto tiap sampel, periksa crop dan konfirmasi angka CV/OCR lokal.",
    "tool": "Alat ukur belum jelas pada foto",
    "requirement_tags": [
      "within_limits"
    ],
    "requirements": [
      {
        "id": "within_limits",
        "label": "Angka berada dalam batas standar"
      }
    ],
    "intervals": [
      "every_4_hours"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "every_4_hours",
      "description": "1 kali per 4 jam",
      "day": {
        "times": [
          {
            "time": "07:45",
            "day_offset": 0
          },
          {
            "time": "09:45",
            "day_offset": 0
          },
          {
            "time": "12:45",
            "day_offset": 0
          },
          {
            "time": "15:45",
            "day_offset": 0
          }
        ],
        "window": null
      },
      "night": {
        "times": [
          {
            "time": "21:15",
            "day_offset": 0
          },
          {
            "time": "23:15",
            "day_offset": 0
          },
          {
            "time": "01:15",
            "day_offset": 1
          },
          {
            "time": "04:15",
            "day_offset": 1
          }
        ],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      }
    ],
    "sample_count": 4,
    "unit": "mm",
    "limits": {
      "minimum": 6.0,
      "maximum": 6.7
    },
    "resolution": 0.01,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084639.jpg",
      "number": null
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "chart_talc_load",
    "definition_version": 1,
    "source_number": null,
    "display_order": 102,
    "name": "Pressure Load Talc Press",
    "group": "talc",
    "process": "Spark Plug Final Assy",
    "kind": "numeric",
    "input_method": "photo",
    "standard_text": "11.00–12.00 kN",
    "method_text": "Unggah foto tiap sampel, periksa crop dan konfirmasi angka CV/OCR lokal.",
    "tool": "Load Cell",
    "requirement_tags": [
      "within_limits"
    ],
    "requirements": [
      {
        "id": "within_limits",
        "label": "Angka berada dalam batas standar"
      }
    ],
    "intervals": [
      "daily"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "daily",
      "description": "1 kali per hari",
      "day": {
        "times": [],
        "window": {
          "start": "07:15",
          "end": "16:25",
          "end_day_offset": 0
        }
      },
      "night": {
        "times": [],
        "window": {
          "start": "21:15",
          "end": "04:45",
          "end_day_offset": 1
        }
      },
      "note": "n=8 sesuai header; tidak ditetapkan delapan jam pengambilan dari foto."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      },
      {
        "id": "n5",
        "label": "Sampel 5"
      },
      {
        "id": "n6",
        "label": "Sampel 6"
      },
      {
        "id": "n7",
        "label": "Sampel 7"
      },
      {
        "id": "n8",
        "label": "Sampel 8"
      }
    ],
    "sample_count": 8,
    "unit": "kN",
    "limits": {
      "minimum": 11.0,
      "maximum": 12.0
    },
    "resolution": null,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084656.jpg",
      "number": null
    },
    "review_notes": [
      "n=8 sesuai header; tidak ditetapkan delapan jam pengambilan dari foto."
    ],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "chart_sweeping_depth",
    "definition_version": 1,
    "source_number": null,
    "display_order": 103,
    "name": "Sweeping DEPTH Check",
    "group": "sweeping",
    "process": "Spark Plug Final Assy",
    "kind": "numeric",
    "input_method": "photo",
    "standard_text": "2.3 ± 0.3 mm (2.0–2.6 mm)",
    "method_text": "Unggah foto tiap sampel, periksa crop dan konfirmasi angka CV/OCR lokal.",
    "tool": "Load Cell (tertulis pada lembar)",
    "requirement_tags": [
      "within_limits"
    ],
    "requirements": [
      {
        "id": "within_limits",
        "label": "Angka berada dalam batas standar"
      }
    ],
    "intervals": [
      "every_4_hours"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "every_4_hours",
      "description": "1 kali per 4 jam",
      "day": {
        "times": [
          {
            "time": "07:45",
            "day_offset": 0
          },
          {
            "time": "09:45",
            "day_offset": 0
          },
          {
            "time": "12:45",
            "day_offset": 0
          },
          {
            "time": "15:45",
            "day_offset": 0
          }
        ],
        "window": null
      },
      "night": {
        "times": [
          {
            "time": "21:15",
            "day_offset": 0
          },
          {
            "time": "23:15",
            "day_offset": 0
          },
          {
            "time": "01:15",
            "day_offset": 1
          },
          {
            "time": "04:15",
            "day_offset": 1
          }
        ],
        "window": null
      },
      "note": "Lembar menyebut Load Cell dengan satuan mm; jenis alat perlu verifikasi."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      }
    ],
    "sample_count": 4,
    "unit": "mm",
    "limits": {
      "minimum": 2.0,
      "maximum": 2.6
    },
    "resolution": 0.01,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084708 (1).jpg",
      "number": null
    },
    "review_notes": [
      "Lembar menyebut Load Cell dengan satuan mm; jenis alat perlu verifikasi."
    ],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "chart_hexagon_size",
    "definition_version": 1,
    "source_number": null,
    "display_order": 104,
    "name": "Hexagon Size Check",
    "group": "hexagon_after",
    "process": "Spark Plug Final Assy",
    "kind": "numeric",
    "input_method": "photo",
    "standard_text": "16.00 −0.27 mm (15.73–16.00 mm)",
    "method_text": "Unggah foto tiap sampel, periksa crop dan konfirmasi angka CV/OCR lokal.",
    "tool": "Alat ukur belum jelas pada foto",
    "requirement_tags": [
      "within_limits"
    ],
    "requirements": [
      {
        "id": "within_limits",
        "label": "Angka berada dalam batas standar"
      }
    ],
    "intervals": [
      "every_4_hours"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "every_4_hours",
      "description": "1 kali per 4 jam",
      "day": {
        "times": [
          {
            "time": "07:45",
            "day_offset": 0
          },
          {
            "time": "09:45",
            "day_offset": 0
          },
          {
            "time": "12:45",
            "day_offset": 0
          },
          {
            "time": "15:45",
            "day_offset": 0
          }
        ],
        "window": null
      },
      "night": {
        "times": [
          {
            "time": "21:15",
            "day_offset": 0
          },
          {
            "time": "23:15",
            "day_offset": 0
          },
          {
            "time": "01:15",
            "day_offset": 1
          },
          {
            "time": "04:15",
            "day_offset": 1
          }
        ],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      }
    ],
    "sample_count": 4,
    "unit": "mm",
    "limits": {
      "minimum": 15.73,
      "maximum": 16.0
    },
    "resolution": 0.01,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084718.jpg",
      "number": null
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "chart_caulking_height",
    "definition_version": 1,
    "source_number": null,
    "display_order": 105,
    "name": "Caulking Height Check",
    "group": "caulking",
    "process": "Spark Plug Final Assy",
    "kind": "numeric",
    "input_method": "photo",
    "standard_text": "15.00 ± 0.10 mm (14.90–15.10 mm)",
    "method_text": "Unggah foto tiap sampel, periksa crop dan konfirmasi angka CV/OCR lokal.",
    "tool": "Dial Gauge",
    "requirement_tags": [
      "within_limits"
    ],
    "requirements": [
      {
        "id": "within_limits",
        "label": "Angka berada dalam batas standar"
      }
    ],
    "intervals": [
      "every_4_hours"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "every_4_hours",
      "description": "1 kali per 4 jam",
      "day": {
        "times": [
          {
            "time": "07:45",
            "day_offset": 0
          },
          {
            "time": "09:45",
            "day_offset": 0
          },
          {
            "time": "12:45",
            "day_offset": 0
          },
          {
            "time": "15:45",
            "day_offset": 0
          }
        ],
        "window": null
      },
      "night": {
        "times": [
          {
            "time": "21:15",
            "day_offset": 0
          },
          {
            "time": "23:15",
            "day_offset": 0
          },
          {
            "time": "01:15",
            "day_offset": 1
          },
          {
            "time": "04:15",
            "day_offset": 1
          }
        ],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      }
    ],
    "sample_count": 4,
    "unit": "mm",
    "limits": {
      "minimum": 14.9,
      "maximum": 15.1
    },
    "resolution": 0.01,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084729.jpg",
      "number": null
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "chart_gasket_press",
    "definition_version": 1,
    "source_number": null,
    "display_order": 106,
    "name": "Gasket Ring Press",
    "group": "gasket",
    "process": "Spark Plug Final Assy",
    "kind": "numeric",
    "input_method": "photo",
    "standard_text": "2.30 −0.30 mm (2.00–2.30 mm)",
    "method_text": "Unggah foto tiap sampel, periksa crop dan konfirmasi angka CV/OCR lokal.",
    "tool": "Dial Gauge",
    "requirement_tags": [
      "within_limits"
    ],
    "requirements": [
      {
        "id": "within_limits",
        "label": "Angka berada dalam batas standar"
      }
    ],
    "intervals": [
      "every_4_hours"
    ],
    "triggers": [
      "routine",
      "dandori"
    ],
    "interval_guide": {
      "interval": "every_4_hours",
      "description": "1 kali per 4 jam",
      "day": {
        "times": [
          {
            "time": "07:45",
            "day_offset": 0
          }
        ],
        "window": null
      },
      "night": {
        "times": [
          {
            "time": "21:55",
            "day_offset": 0
          }
        ],
        "window": null
      },
      "note": "Header 1/4H atau Dandori tetapi hanya satu waktu tiap shift tercantum; jadwal lengkap perlu verifikasi."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      }
    ],
    "sample_count": 4,
    "unit": "mm",
    "limits": {
      "minimum": 2.0,
      "maximum": 2.3
    },
    "resolution": 0.01,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084738.jpg",
      "number": null
    },
    "review_notes": [
      "Header 1/4H atau Dandori tetapi hanya satu waktu tiap shift tercantum; jadwal lengkap perlu verifikasi."
    ],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  },
  {
    "id": "chart_ee_length",
    "definition_version": 1,
    "source_number": null,
    "display_order": 107,
    "name": "Panjang EE / EE Cutting",
    "group": "ee",
    "process": "Spark Plug Final Assy",
    "kind": "numeric",
    "input_method": "photo",
    "standard_text": "4.5 ± 0.1 mm (4.4–4.6 mm)",
    "method_text": "Unggah foto tiap sampel, periksa crop dan konfirmasi angka CV/OCR lokal.",
    "tool": "Dial Gauge",
    "requirement_tags": [
      "within_limits"
    ],
    "requirements": [
      {
        "id": "within_limits",
        "label": "Angka berada dalam batas standar"
      }
    ],
    "intervals": [
      "daily"
    ],
    "triggers": [
      "routine"
    ],
    "interval_guide": {
      "interval": "daily",
      "description": "1 kali per hari",
      "day": {
        "times": [
          {
            "time": "07:45",
            "day_offset": 0
          }
        ],
        "window": null
      },
      "night": {
        "times": [
          {
            "time": "21:45",
            "day_offset": 0
          }
        ],
        "window": null
      },
      "note": "Pilih shift dan waktu aktual. Batas jam shift / hari mingguan belum ditetapkan."
    },
    "default_sampler": "Ldr",
    "shifts": [
      "day",
      "night"
    ],
    "samples": [
      {
        "id": "n1",
        "label": "Sampel 1"
      },
      {
        "id": "n2",
        "label": "Sampel 2"
      },
      {
        "id": "n3",
        "label": "Sampel 3"
      },
      {
        "id": "n4",
        "label": "Sampel 4"
      }
    ],
    "sample_count": 4,
    "unit": "mm",
    "limits": {
      "minimum": 4.4,
      "maximum": 4.6
    },
    "resolution": 0.01,
    "fixture_count": null,
    "source": {
      "file": "IMG_20261009_084803.jpg",
      "number": null
    },
    "review_notes": [],
    "outcome_guide": "OK = seluruh sampel memenuhi persyaratan; satu NG membuat hasil item NG."
  }
];
