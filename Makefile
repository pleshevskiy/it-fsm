DENO := deno
COV := $(DENO) coverage cov_profile
FMT := $(DENO) fmt *.ts examples/*.ts
NPM_PUB := npm publish

D2 := nix run git+https://git.pleshevski.ru/mynix/tools\\\#d2 --
DIAGRAMS := \
	turnstile

turnstile_theme_args := --layout elk --theme 101

dev: fmt tests cov

ci: fmt-check tests-cov

tests: clean
	$(DENO) test --coverage=cov_profile *.test.ts

tests-cov: tests
	$(COV) --lcov > cov_profile/cov.lcov

cov:
	$(COV)

fmt:
	$(FMT)

fmt-check:
	$(FMT) --check

build: clean | $(DIAGRAMS)
	tsc && tsc -p tsconfig.cjs.json

clean:
	@echo clean test coverage data
	rm -rf cov_profile
	@echo clean build target
	rm -rf dist
	@echo clean diagrams
	rm -rf assets/*.svg

define d2rule
$(1)_args := $(D2) $$($(1)_theme_args) assets/$(1).d2 assets/$(1).svg

$(1): ; $$($(1)_args)
$(1)-w: ; $$($(1)_args) -w
endef

$(foreach d2name,$(DIAGRAMS),$(eval $(call d2rule,$(d2name))))

dry-pub:
	$(NPM_PUB) --dry-run

pub:
	$(NPM_PUB)

help:
	cat Makefile

