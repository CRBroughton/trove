package api

import "testing"

func TestSanitizePath(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"gba/pokemon.srm", "gba/pokemon.srm"},
		{"pokemon.srm", "pokemon.srm"},
		{"deep/nested/save.sav", "deep/nested/save.sav"},
		// empty / dot → rejected
		{"", ""},
		{".", ""},
		// traversal → rejected
		{"../etc/passwd", ""},
		{"gba/../../etc/passwd", ""},
		// absolute → rejected
		{"/etc/passwd", ""},
		// cleans redundant separators but stays valid
		{"gba//pokemon.srm", "gba/pokemon.srm"},
	}

	for _, tc := range cases {
		got := sanitizePath(tc.input)
		if got != tc.want {
			t.Errorf("sanitizePath(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}
