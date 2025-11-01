#!/usr/bin/env bats

@test "convert Wendigo" {
    run node test_converter.js tests/mystic_arts/Wendigo.md
    diff -u tests/yaml/wendigo.yaml <(echo "$output")
    [ $status -eq 0 ]
}

@test "convert Skinwalker" {
    run node test_converter.js tests/mystic_arts/Skinwalker.md
    diff -u tests/yaml/skinwalker.yaml <(echo "$output")
    [ $status -eq 0 ]
}
