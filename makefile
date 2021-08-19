DENO := deno

tests: clean fmt-check
	$(DENO) test --coverage=cov_profile *.test.mjs

tests-cov: tests
	$(DENO) coverage cov_profile --lcov > cov_profile/cov.lcov

fmt:
	$(DENO) fmt *.mjs

fmt-check:
	$(DENO) fmt *.mjs --check

clean:
	rm -rf cov_profile
