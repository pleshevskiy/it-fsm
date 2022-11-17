DENO := deno
COV := $(DENO) coverage cov_profile
FMT := $(DENO) fmt *.ts examples/*.ts

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

clean:
	rm -rf cov_profile dist
